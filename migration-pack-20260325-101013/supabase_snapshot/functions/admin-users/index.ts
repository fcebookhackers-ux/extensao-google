import { createClient } from "jsr:@supabase/supabase-js@2.94.1";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};

type Action =
  | { action: "list"; page?: number; perPage?: number; query?: string }
  | { action: "ban"; userId: string; duration?: string }
  | { action: "unban"; userId: string }
  | { action: "impersonation_link"; email: string; redirectTo?: string };

function json(data: unknown, status = 200) {
  return new Response(JSON.stringify(data), {
    status,
    headers: { ...corsHeaders, "Content-Type": "application/json" },
  });
}

function getEnv(name: string) {
  const v = Deno.env.get(name);
  if (!v) throw new Error(`Missing env var: ${name}`);
  return v;
}

function getServiceRoleKey() {
  const v = Deno.env.get("SERVICE_ROLE_KEY") ?? Deno.env.get("SUPABASE_SERVICE_ROLE_KEY");
  if (!v) throw new Error("Missing env var: SERVICE_ROLE_KEY");
  return v;
}

Deno.serve(async (req) => {
  // Handle CORS preflight requests
  if (req.method === "OPTIONS") return new Response("ok", { headers: corsHeaders });

  try {
    const SUPABASE_URL = getEnv("SUPABASE_URL");
    const SUPABASE_SERVICE_ROLE_KEY = getServiceRoleKey();

    const authHeader = req.headers.get("Authorization") ?? "";
    if (!authHeader) return json({ error: "Missing Authorization header" }, 401);

    // Usamos Service Role para tudo (sem depender de env do ANON/PUBLISHABLE_KEY).
    // Ainda assim validamos o usuário chamador via JWT no Authorization header.
    const supabaseCaller = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY, {
      global: { headers: { Authorization: authHeader } },
      auth: { persistSession: false },
    });

    const { data: userData, error: userErr } = await supabaseCaller.auth.getUser();
    if (userErr || !userData?.user) {
      console.log("auth.getUser error", userErr);
      return json({ error: "Unauthorized" }, 401);
    }

    // Service client for admin operations
    const supabaseAdmin = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY, {
      auth: { persistSession: false },
    });

    const { data: isAdmin, error: roleErr } = await supabaseAdmin.rpc("has_role", {
      _user_id: userData.user.id,
      _role: "admin",
    });
    if (roleErr) {
      console.log("has_role error", roleErr);
      return json({ error: "Role check failed" }, 500);
    }
    if (!isAdmin) return json({ error: "Forbidden" }, 403);

    if (req.method !== "POST") return json({ error: "Method not allowed" }, 405);

    const body = (await req.json().catch(() => null)) as Action | null;
    if (!body || !("action" in body)) return json({ error: "Invalid body" }, 400);

    if (body.action === "list") {
      const page = Math.max(1, Number(body.page ?? 1));
      const perPage = Math.min(100, Math.max(1, Number(body.perPage ?? 20)));

      const { data, error } = await supabaseAdmin.auth.admin.listUsers({ page, perPage });
      if (error) return json({ error: error.message }, 400);

      const q = (body.query ?? "").trim().toLowerCase();
      const users = (data?.users ?? []).filter((u) => {
        if (!q) return true;
        const email = (u.email ?? "").toLowerCase();
        return email.includes(q) || u.id.includes(q);
      });

      return json({ users, page, perPage });
    }

    if (body.action === "ban") {
      const duration = body.duration ?? "87600h"; // ~10 anos (equivalente a "desativar")
      const { data, error } = await supabaseAdmin.auth.admin.updateUserById(body.userId, {
        ban_duration: duration,
      } as any);
      if (error) return json({ error: error.message }, 400);
      return json({ ok: true, user: data.user });
    }

    if (body.action === "unban") {
      const { data, error } = await supabaseAdmin.auth.admin.updateUserById(body.userId, {
        ban_duration: "none",
      } as any);
      if (error) return json({ error: error.message }, 400);
      return json({ ok: true, user: data.user });
    }

    if (body.action === "impersonation_link") {
      const redirectTo = body.redirectTo;
      const { data, error } = await supabaseAdmin.auth.admin.generateLink({
        type: "magiclink",
        email: body.email,
        options: redirectTo ? { redirectTo } : undefined,
      } as any);
      if (error) return json({ error: error.message }, 400);

      // Supabase pode variar o formato: deixamos robusto.
      const action_link = (data as any)?.properties?.action_link ?? (data as any)?.action_link ?? null;

      return json({ ok: true, action_link, data });
    }

    return json({ error: "Unknown action" }, 400);
  } catch (e) {
    console.log("admin-users error", e);
    return json({ error: String((e as any)?.message ?? e) }, 500);
  }
});
