import { createClient } from "jsr:@supabase/supabase-js@2.94.1";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};

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
    const serviceRoleKey = Deno.env.get("SERVICE_ROLE_KEY");
    const cronSecret = Deno.env.get("WEBHOOK_ROTATION_CRON_SECRET");
    if (!supabaseUrl || !serviceRoleKey || !cronSecret) {
      return json({ error: "Server misconfigured" }, 500);
    }

    const authHeader = req.headers.get("Authorization") || "";
    const expected = `Bearer ${cronSecret}`;
    if (authHeader !== expected) {
      return json({ error: "Unauthorized" }, 401);
    }

    const admin = createClient(supabaseUrl, serviceRoleKey);

    // Find due secrets BEFORE rotation (so we know who to notify)
    const { data: dueRows, error: dueErr } = await admin
      .from("webhook_secrets")
      .select("webhook_id,user_id")
      .eq("active", true)
      .lte("expires_at", new Date().toISOString());

    if (dueErr) {
      console.log("rotate-webhook-secrets: failed to fetch due secrets", dueErr);
      return json({ error: "Failed to fetch due secrets" }, 500);
    }

    const { data: rotatedCount, error: rotErr } = await admin.rpc("rotate_due_webhook_secrets", {
      p_rotation_days: 90,
      p_grace_days: 7,
    });

    if (rotErr) {
      console.log("rotate-webhook-secrets: rotation failed", rotErr);
      return json({ error: "Rotation failed" }, 500);
    }

    const uniqueUserWebhook = new Set((dueRows ?? []).map((r) => `${r.user_id}:${r.webhook_id}`));
    const now = new Date().toISOString();

    // Notify users (in-app notifications)
    const notifications = Array.from(uniqueUserWebhook).map((key) => {
      const [user_id, webhook_id] = key.split(":");
      return {
        user_id,
        type: "system" as const,
        priority: "medium" as const,
        title: "Secret do webhook rotacionado",
        message:
          "Seu secret de webhook foi rotacionado automaticamente. Atualize o sistema externo dentro de 7 dias. Você pode revelar o novo secret uma única vez na tela de Webhooks.",
        metadata: { webhook_id },
        created_at: now,
      };
    });

    if (notifications.length) {
      const { error: notifErr } = await admin.from("notifications").insert(notifications);
      if (notifErr) {
        console.log("rotate-webhook-secrets: failed to insert notifications", notifErr);
      }
    }

    return json({ ok: true, rotated: rotatedCount ?? 0, notified: notifications.length });
  } catch (e) {
    console.log("rotate-webhook-secrets: unexpected error", e);
    return json({ error: "Unexpected error" }, 500);
  }
});
