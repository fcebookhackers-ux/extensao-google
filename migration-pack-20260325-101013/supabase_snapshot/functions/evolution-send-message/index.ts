import { createClient } from "jsr:@supabase/supabase-js@2.94.1";
import { requireAuth, requirePermission } from "../_shared/auth-helpers.ts";
import { buildEvolutionHeaders, getEvolutionAuthConfig } from "../_shared/evolution-helpers.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type, traceparent, tracestate, baggage, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
} as const;

function json(body: unknown, status = 200) {
  return new Response(JSON.stringify(body), {
    status,
    headers: { ...corsHeaders, "content-type": "application/json; charset=utf-8" },
  });
}

function getEnv(name: string) {
  const v = Deno.env.get(name);
  if (!v) throw new Error(`Missing env var: ${name}`);
  return v;
}

function normalizeToJid(to: string) {
  const cleaned = to.trim();
  if (cleaned.includes("@")) return cleaned;
  const digits = cleaned.replace(/\D/g, "");
  return `${digits}@s.whatsapp.net`;
}

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: corsHeaders });

  try {
    const { userId, authHeader } = await requireAuth(req, corsHeaders);

    const body = (await req.json().catch(() => ({}))) as {
      instanceId?: string;
      whatsappInstanceId?: string;
      to?: string;
      message?: string;
      mediaUrl?: string;
      mediaType?: string;
    };

    const whatsappInstanceId = body.whatsappInstanceId ?? body.instanceId;
    const to = body.to;
    const message = body.message;

    if (!whatsappInstanceId || !to || !message) {
      return json({ error: "instanceId/whatsappInstanceId, to, and message are required" }, 400);
    }

    const supabaseUrl = getEnv("SUPABASE_URL");
    const supabaseAnonKey = getEnv("SUPABASE_ANON_KEY");
    const supabase = createClient(supabaseUrl, supabaseAnonKey, {
      global: { headers: { Authorization: authHeader } },
      auth: { persistSession: false },
    });

    const { data: instance, error: instanceError } = await supabase
      .from("whatsapp_instances")
      .select("id,workspace_id,instance_name,status")
      .eq("id", whatsappInstanceId)
      .maybeSingle();

    if (instanceError || !instance) return json({ error: "Instance not found" }, 404);

    await requirePermission(userId, instance.workspace_id, "whatsapp.manage", corsHeaders);

    if (instance.status !== "connected") return json({ error: "Instance not connected" }, 400);

    const evolution = getEvolutionAuthConfig();
    const evolutionUrl = getEnv("EVOLUTION_API_URL");
    if (!evolution.key) return json({ error: "EVOLUTION_API_KEY não configurado" }, 500);

    const number = normalizeToJid(to);
    const baseUrl = evolutionUrl.replace(/\/$/, "");
    const hasMedia = Boolean(body.mediaUrl);

    console.log("Sending message:", { instance: instance.instance_name, number, hasMedia });

    const endpoint = hasMedia
      ? `${baseUrl}/message/sendMedia/${encodeURIComponent(instance.instance_name)}`
      : `${baseUrl}/message/sendText/${encodeURIComponent(instance.instance_name)}`;

    const payload = hasMedia
      ? {
        number,
        mediatype: body.mediaType || "image",
        media: body.mediaUrl,
        caption: message,
      }
      : {
        number,
        text: message,
      };

    const resp = await fetch(endpoint, {
      method: "POST",
      headers: buildEvolutionHeaders(evolution, { "content-type": "application/json" }),
      body: JSON.stringify(payload),
    });

    if (!resp.ok) {
      const errorText = await resp.text();
      console.error("Evolution API error:", errorText);
      return json({ error: `Failed to send message: ${errorText}` }, 502);
    }

    const result = await resp.json().catch(() => ({}));
    return json(result);
  } catch (e) {
    // auth-helpers pode lançar Response para 401/403
    if (e instanceof Response) return e;

    console.error("Send message error:", e);
    const msg = e instanceof Error ? e.message : String(e);
    const status = msg.includes("Unauthorized") || msg.includes("Missing or invalid authorization") ? 401 : 500;
    return json({ error: msg }, status);
  }
});
