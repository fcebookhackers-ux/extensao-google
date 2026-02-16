import { createClient } from "jsr:@supabase/supabase-js@2.94.1";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};

function json(data: unknown, status = 200, extraHeaders: Record<string, string> = {}) {
  return new Response(JSON.stringify(data), {
    status,
    headers: {
      ...corsHeaders,
      "Content-Type": "application/json",
      ...extraHeaders,
    },
  });
}

function addMonthsUtc(d: Date, months: number) {
  const year = d.getUTCFullYear();
  const month = d.getUTCMonth();
  const day = d.getUTCDate();

  const target = new Date(Date.UTC(year, month + months, 1, d.getUTCHours(), d.getUTCMinutes(), d.getUTCSeconds(), d.getUTCMilliseconds()));
  // Clamp day to last day of target month
  const lastDay = new Date(Date.UTC(target.getUTCFullYear(), target.getUTCMonth() + 1, 0)).getUTCDate();
  target.setUTCDate(Math.min(day, lastDay));
  return target;
}

function computeNextRun(scheduleType: string, from: Date) {
  const type = scheduleType.toLowerCase();
  const next = new Date(from);

  if (type === "once" || type === "one_time" || type === "single") {
    return { nextRunAt: null as string | null, disable: true };
  }

  if (type === "daily") {
    next.setUTCDate(next.getUTCDate() + 1);
    return { nextRunAt: next.toISOString(), disable: false };
  }

  if (type === "weekly") {
    next.setUTCDate(next.getUTCDate() + 7);
    return { nextRunAt: next.toISOString(), disable: false };
  }

  if (type === "monthly") {
    const m = addMonthsUtc(next, 1);
    return { nextRunAt: m.toISOString(), disable: false };
  }

  // Nesta etapa: cron não suportado
  throw new Error(`Unsupported schedule_type: ${scheduleType}`);
}

function getServiceRoleKey() {
  return Deno.env.get("SERVICE_ROLE_KEY") ?? Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") ?? "";
}

function requireCronAuth(req: Request) {
  // Runner é chamado via pg_cron; nesta etapa exigimos apenas o token público (anon)
  // para evitar chamadas acidentais sem header.
  const expected = Deno.env.get("SUPABASE_ANON_KEY") ?? Deno.env.get("SUPABASE_PUBLISHABLE_KEY") ?? "";
  if (!expected) return;
  const auth = req.headers.get("authorization") ?? req.headers.get("Authorization") ?? "";
  if (auth !== `Bearer ${expected}`) {
    throw new Error("Unauthorized");
  }
}

type ScheduledAutomationRow = {
  id: string;
  automation_id: string;
  user_id: string;
  schedule_type: string;
  schedule_config: unknown;
  next_run_at: string | null;
  last_run_at: string | null;
  enabled: boolean;
};

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: corsHeaders });
  if (req.method !== "POST") return json({ error: "Method not allowed" }, 405);

  try {
    requireCronAuth(req);

    const SUPABASE_URL = Deno.env.get("SUPABASE_URL") ?? "";
    const SERVICE_ROLE_KEY = getServiceRoleKey();
    if (!SUPABASE_URL || !SERVICE_ROLE_KEY) return json({ error: "Server misconfigured" }, 500);

    const admin = createClient(SUPABASE_URL, SERVICE_ROLE_KEY, {
      auth: { persistSession: false },
    });

    const now = new Date();
    const nowIso = now.toISOString();

    // Busca jobs vencidos
    const { data: due, error } = await admin
      .from("scheduled_automations")
      .select("id,automation_id,user_id,schedule_type,schedule_config,next_run_at,last_run_at,enabled")
      .eq("enabled", true)
      .not("next_run_at", "is", null)
      .lte("next_run_at", nowIso)
      .order("next_run_at", { ascending: true })
      .limit(50);
    if (error) throw error;

    const rows = (due ?? []) as ScheduledAutomationRow[];
    let processed = 0;
    const errors: Array<{ id: string; error: string }> = [];

    for (const row of rows) {
      try {
        const { nextRunAt, disable } = computeNextRun(row.schedule_type, now);

        // Atualiza controle de execução
        const { error: updErr } = await admin
          .from("scheduled_automations")
          .update({
            last_run_at: nowIso,
            next_run_at: nextRunAt,
            enabled: disable ? false : row.enabled,
          })
          .eq("id", row.id);
        if (updErr) throw updErr;

        processed += 1;
      } catch (e) {
        errors.push({ id: row.id, error: (e as Error)?.message ?? String(e) });
      }
    }

    return json({ ok: true, now: nowIso, due: rows.length, processed, errors }, 200);
  } catch (e) {
    const msg = (e as Error)?.message ?? String(e);
    const status = msg === "Unauthorized" ? 401 : 500;
    return json({ ok: false, error: msg }, status);
  }
});
