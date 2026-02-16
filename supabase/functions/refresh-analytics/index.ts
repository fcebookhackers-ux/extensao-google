import { createClient } from "jsr:@supabase/supabase-js@2.94.1";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};

function json(body: unknown, status = 200) {
  return new Response(JSON.stringify(body), {
    status,
    headers: {
      ...corsHeaders,
      "Content-Type": "application/json; charset=utf-8",
    },
  });
}

function getSecretFromRequest(req: Request) {
  // Suporta nomes comuns para facilitar integração com cron/net.http_post
  return (
    req.headers.get("x-refresh-analytics-secret") ??
    req.headers.get("x-refresh-analytics-key") ??
    null
  );
}

Deno.serve(async (req) => {
  try {
    if (req.method === "OPTIONS") return new Response("ok", { headers: corsHeaders });
    if (req.method !== "POST") return json({ error: "Method not allowed" }, 405);

    const expectedSecret = Deno.env.get("REFRESH_ANALYTICS_SECRET") ?? "";
    if (!expectedSecret) {
      console.error("refresh-analytics: missing REFRESH_ANALYTICS_SECRET env");
      return json({ error: "Server misconfigured" }, 500);
    }

    const providedSecret = getSecretFromRequest(req);
    if (!providedSecret || providedSecret !== expectedSecret) {
      return json({ error: "Unauthorized" }, 401);
    }

    const supabaseUrl = Deno.env.get("SUPABASE_URL");
    const supabaseAnonKey = Deno.env.get("SUPABASE_ANON_KEY");
    if (!supabaseUrl || !supabaseAnonKey) {
      console.error("refresh-analytics: missing SUPABASE_URL/SUPABASE_ANON_KEY env");
      return json({ error: "Server misconfigured" }, 500);
    }

    const supabase = createClient(supabaseUrl, supabaseAnonKey);

    console.log("refresh-analytics: invoking refresh_materialized_views");
    const { data, error } = await supabase.rpc("refresh_materialized_views");
    if (error) {
      console.error("refresh-analytics: rpc error", error);
      return json({ error: "Refresh failed" }, 500);
    }

    return json({ ok: true, data });
  } catch (err) {
    console.error("refresh-analytics: unhandled", err);
    return json({ error: "Internal error" }, 500);
  }
});
