import { createClient } from "https://esm.sh/@supabase/supabase-js@2.94.0?target=deno";

type Domain = "webhooks" | "uploads" | "automations" | "sync";

type WebhooksSli = { success_rate: number | string | null; p95_latency: number | string | null };
type UploadsSli = { success_rate: number | string | null; p95_validation_time: number | string | null };
type GenericSli = { success_rate: number | string | null; p95_latency: number | string | null };

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type, traceparent, tracestate, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};

function json(body: unknown, status = 200) {
  return new Response(JSON.stringify(body), {
    status,
    headers: { ...corsHeaders, "Content-Type": "application/json" },
  });
}

function getServiceRoleKey() {
  return (
    Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") ||
    Deno.env.get("SERVICE_ROLE_KEY") ||
    ""
  );
}

async function computeAndStore(windowHours = 24) {
  const supabaseUrl = Deno.env.get("SUPABASE_URL") ?? "";
  const serviceRoleKey = getServiceRoleKey();
  if (!supabaseUrl || !serviceRoleKey) {
    console.log("calculate-slis: missing SUPABASE_URL or service role key");
    return { ok: false, error: "Server misconfigured" };
  }

  const admin = createClient(supabaseUrl, serviceRoleKey);

  const windowEnd = new Date();
  const windowStart = new Date(windowEnd.getTime() - windowHours * 60 * 60 * 1000);

  const targets = {
    webhooks: { success_rate: 99.5, p95_latency_ms: 2000 },
    uploads: { success_rate: 99.9, p95_latency_ms: 500 },
    automations: { success_rate: 99.0, p95_latency_ms: 5000 },
    sync: { success_rate: 99.0, p95_latency_ms: 2000 },
  } as const;

  const results: Array<{ domain: Domain; metric_name: string; value: number; target: number }> = [];

  // Webhooks
  {
    const { data, error } = await admin
      .rpc("calculate_sli_webhooks", { p_window_hours: windowHours })
      .single();
    if (error) throw error;

    const row = (data ?? {}) as WebhooksSli;

    results.push({
      domain: "webhooks",
      metric_name: "success_rate",
      value: Number(row.success_rate ?? 0),
      target: targets.webhooks.success_rate,
    });
    results.push({
      domain: "webhooks",
      metric_name: "p95_latency_ms",
      value: Number(row.p95_latency ?? 0),
      target: targets.webhooks.p95_latency_ms,
    });
  }

  // Uploads
  {
    const { data, error } = await admin
      .rpc("calculate_sli_uploads", { p_window_hours: windowHours })
      .single();
    if (error) throw error;

    const row = (data ?? {}) as UploadsSli;

    results.push({
      domain: "uploads",
      metric_name: "success_rate",
      value: Number(row.success_rate ?? 0),
      target: targets.uploads.success_rate,
    });
    results.push({
      domain: "uploads",
      metric_name: "p95_latency_ms",
      value: Number(row.p95_validation_time ?? 0),
      target: targets.uploads.p95_latency_ms,
    });
  }

  // Automations
  {
    const { data, error } = await admin
      .rpc("calculate_sli_automations", { p_window_hours: windowHours })
      .single();
    if (error) throw error;

    const row = (data ?? {}) as GenericSli;

    results.push({
      domain: "automations",
      metric_name: "success_rate",
      value: Number(row.success_rate ?? 0),
      target: targets.automations.success_rate,
    });
    results.push({
      domain: "automations",
      metric_name: "p95_latency_ms",
      value: Number(row.p95_latency ?? 0),
      target: targets.automations.p95_latency_ms,
    });
  }

  // Sync
  {
    const { data, error } = await admin
      .rpc("calculate_sli_sync", { p_window_hours: windowHours })
      .single();
    if (error) throw error;

    const row = (data ?? {}) as GenericSli;

    results.push({
      domain: "sync",
      metric_name: "success_rate",
      value: Number(row.success_rate ?? 0),
      target: targets.sync.success_rate,
    });
    results.push({
      domain: "sync",
      metric_name: "p95_latency_ms",
      value: Number(row.p95_latency ?? 0),
      target: targets.sync.p95_latency_ms,
    });
  }

  const rows = results.map((r) => ({
    domain: r.domain,
    metric_name: r.metric_name,
    value: r.value,
    target: r.target,
    window_start: windowStart.toISOString(),
    window_end: windowEnd.toISOString(),
  }));

  const { error: insertErr } = await admin.from("sli_metrics").insert(rows);
  if (insertErr) throw insertErr;

  console.log("calculate-slis: inserted", { count: rows.length, windowHours });
  return { ok: true, inserted: rows.length };
}

// HTTP trigger (use pg_cron/pg_net or external scheduler)
Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: corsHeaders });
  if (req.method !== "POST") return json({ ok: false, error: "Method not allowed" }, 405);

  try {
    const secret = Deno.env.get("SLI_CRON_SECRET") ?? "";
    const provided = req.headers.get("x-sli-cron-secret") ?? "";
    if (!secret) return json({ ok: false, error: "Server misconfigured" }, 500);
    if (provided !== secret) return json({ ok: false, error: "Unauthorized" }, 401);

    const body = (await req.json().catch(() => ({}))) as { windowHours?: number };
    const windowHours = typeof body.windowHours === "number" ? body.windowHours : 24;
    const res = await computeAndStore(windowHours);
    return json(res, res.ok ? 200 : 500);
  } catch (e) {
    console.log("calculate-slis http error", { error: String(e) });
    return json({ ok: false, error: "Unexpected error" }, 500);
  }
});
