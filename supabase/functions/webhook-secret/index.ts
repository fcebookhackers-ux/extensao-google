import { createClient } from "jsr:@supabase/supabase-js@2.94.1";
import { requireAuth } from "../_shared/auth-helpers.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};

type Body =
  | { action: "create_if_missing"; webhook_id: string }
  | { action: "claim_latest"; webhook_id: string };

function json(body: unknown, status = 200, headers: HeadersInit = {}) {
  return new Response(JSON.stringify(body), {
    status,
    headers: {
      "content-type": "application/json; charset=utf-8",
      ...corsHeaders,
      ...headers,
    },
  });
}

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: corsHeaders });

  try {
    const supabaseUrl = Deno.env.get("SUPABASE_URL");
    const supabaseAnonKey = Deno.env.get("SUPABASE_ANON_KEY");
    const serviceRoleKey = Deno.env.get("SERVICE_ROLE_KEY");
    if (!supabaseUrl || !supabaseAnonKey || !serviceRoleKey) {
      return json({ error: "Server misconfigured" }, 500);
    }

    let authHeader = "";
    let userId = "";
    try {
      const auth = await requireAuth(req, corsHeaders);
      authHeader = auth.authHeader;
      userId = auth.userId;
    } catch (e) {
      if (e instanceof Response) return e;
      throw e;
    }

    const supabase = createClient(supabaseUrl, supabaseAnonKey, {
      global: { headers: { Authorization: authHeader } },
    });

    const body = (await req.json().catch(() => null)) as Body | null;
    if (!body || !("action" in body) || !("webhook_id" in body)) {
      return json({ error: "Invalid body" }, 400);
    }

    // Ensure user owns the webhook (defense-in-depth)
    const { data: webhookRow, error: webhookErr } = await supabase
      .from("webhooks")
      .select("id,user_id")
      .eq("id", body.webhook_id)
      .single();
    if (webhookErr || !webhookRow) return json({ error: "Webhook not found" }, 404);
    if (webhookRow.user_id !== userId) return json({ error: "Forbidden" }, 403);

    if (body.action === "create_if_missing") {
      // This function returns plaintext only on first creation.
      const { data, error } = await supabase.rpc("create_webhook_secret_once", {
        p_webhook_id: body.webhook_id,
      });
      if (error) return json({ error: "Failed to create secret" }, 500);
      return json({
        created: Boolean(data?.created),
        secret: data?.secret ?? null,
        last4: data?.last4 ?? null,
      });
    }

    // claim_latest: reveal current secret only if not claimed yet (1x)
    const supabaseAdmin = createClient(supabaseUrl, serviceRoleKey);
    const { data: secretRow, error: secretErr } = await supabaseAdmin
      .from("webhook_secrets")
      .select("id,encrypted_value,claimed_at,secret_last4")
      .eq("webhook_id", body.webhook_id)
      .eq("active", true)
      .single();

    if (secretErr || !secretRow) {
      return json({ error: "Secret not configured" }, 404);
    }

    if (secretRow.claimed_at) {
      return json({ claimed: true, secret: null, last4: secretRow.secret_last4 });
    }

    const { data: plaintext, error: decErr } = await supabaseAdmin.rpc("decrypt_webhook_secret", {
      p_encrypted_text: secretRow.encrypted_value,
    });
    if (decErr || !plaintext) {
      return json({ error: "Failed to decrypt" }, 500);
    }

    await supabaseAdmin
      .from("webhook_secrets")
      .update({ claimed_at: new Date().toISOString() })
      .eq("id", secretRow.id);

    return json({ claimed: false, secret: plaintext, last4: secretRow.secret_last4 });
  } catch (e) {
    console.log("webhook-secret: unexpected error", e);
    return json({ error: "Unexpected error" }, 500);
  }
});
