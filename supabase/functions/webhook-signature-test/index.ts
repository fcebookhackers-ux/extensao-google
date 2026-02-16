// Edge Function: webhook-signature-test
// Authenticated test endpoint to:
// - generate signature headers for a webhook_id
// - verify signatures with anti-replay (5 min window + nonce store)

import { createClient } from "jsr:@supabase/supabase-js@2.94.1";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version, traceparent, tracestate",
};

function json(body: unknown, status = 200) {
  return new Response(JSON.stringify(body), {
    status,
    headers: { "content-type": "application/json; charset=utf-8", ...corsHeaders },
  });
}

function hexToBytes(hex: string): Uint8Array {
  const clean = hex.trim().toLowerCase();
  if (clean.length % 2 !== 0) throw new Error("Invalid hex length");
  const out = new Uint8Array(clean.length / 2);
  for (let i = 0; i < out.length; i++) out[i] = parseInt(clean.slice(i * 2, i * 2 + 2), 16);
  return out;
}

function timingSafeEqual(a: Uint8Array, b: Uint8Array): boolean {
  if (a.length !== b.length) return false;
  let diff = 0;
  for (let i = 0; i < a.length; i++) diff |= a[i] ^ b[i];
  return diff === 0;
}

async function hmacSha256Hex(secret: string, message: string) {
  const enc = new TextEncoder();
  const key = await crypto.subtle.importKey(
    "raw",
    enc.encode(secret),
    { name: "HMAC", hash: "SHA-256" },
    false,
    ["sign"],
  );
  const sig = await crypto.subtle.sign("HMAC", key, enc.encode(message));
  return Array.from(new Uint8Array(sig))
    .map((b) => b.toString(16).padStart(2, "0"))
    .join("");
}

async function requireUser(req: Request) {
  const authHeader = req.headers.get("Authorization") || "";
  if (!authHeader.startsWith("Bearer ")) return { authHeader: null, userId: null };

  const supabaseUrl = Deno.env.get("SUPABASE_URL") ?? "";
  const supabaseAnonKey = Deno.env.get("SUPABASE_ANON_KEY") ?? "";
  if (!supabaseUrl || !supabaseAnonKey) return { authHeader: null, userId: null };

  const supabase = createClient(supabaseUrl, supabaseAnonKey, { global: { headers: { Authorization: authHeader } } });
  const token = authHeader.replace("Bearer ", "");
  const { data, error } = await supabase.auth.getClaims(token);
  const userId = data?.claims?.sub ?? null;
  if (error || !userId) return { authHeader: null, userId: null };
  return { authHeader, userId, supabase };
}

async function getSecretForWebhook(service: any, webhookId: string): Promise<string | null> {
  const { data, error } = await service.rpc("get_webhook_secrets_for_delivery", { p_webhook_id: webhookId });
  if (error) return null;
  return data?.current ? String(data.current) : null;
}

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: corsHeaders });
  if (req.method !== "POST") return json({ error: "Method not allowed" }, 405);

  try {
    const { authHeader, userId, supabase } = await requireUser(req);
    if (!authHeader || !userId || !supabase) return json({ error: "Unauthorized" }, 401);

    const supabaseUrl = Deno.env.get("SUPABASE_URL") ?? "";
    const serviceRoleKey = Deno.env.get("SERVICE_ROLE_KEY") ?? "";
    if (!supabaseUrl || !serviceRoleKey) return json({ error: "Server misconfigured" }, 500);
    const service = createClient(supabaseUrl, serviceRoleKey);

    const body = (await req.json().catch(() => null)) as any;
    const action = String(body?.action ?? "");
    const webhookId = String(body?.webhook_id ?? "");
    if (!webhookId) return json({ error: "Missing webhook_id" }, 400);

    // Ownership check via RLS on webhooks (user client)
    const { data: webhook, error: wErr } = await supabase
      .from("webhooks")
      .select("id,user_id")
      .eq("id", webhookId)
      .single();
    if (wErr || !webhook) return json({ error: "Webhook not found" }, 404);
    if (String(webhook.user_id) !== String(userId)) return json({ error: "Forbidden" }, 403);

    const secret = await getSecretForWebhook(service, webhookId);
    if (!secret) return json({ error: "Missing webhook secret" }, 400);

    if (action === "sign") {
      const payload = body?.payload ?? {};
      const timestampMs = Number(body?.timestamp_ms ?? Date.now());
      const payloadStr = JSON.stringify(payload);
      const signature = await hmacSha256Hex(secret, payloadStr);
      return json({
        webhook_id: webhookId,
        timestamp_ms: timestampMs,
        signature_hex: signature,
        headers: {
          "X-Webhook-Id": webhookId,
          "X-Webhook-Timestamp": String(timestampMs),
          "X-Webhook-Signature": signature,
        },
      });
    }

    if (action === "verify") {
      const payloadRaw = body?.payload;
      const signatureHex = String(body?.signature_hex ?? "");
      const timestampMs = Number(body?.timestamp_ms ?? 0);
      if (!signatureHex || !timestampMs) return json({ error: "Missing signature_hex or timestamp_ms" }, 400);

      const now = Date.now();
      const maxSkewMs = 5 * 60 * 1000;
      if (Math.abs(now - timestampMs) > maxSkewMs) {
        return json({ ok: false, reason: "timestamp_out_of_window" }, 401);
      }

      const payloadStr = typeof payloadRaw === "string" ? payloadRaw : JSON.stringify(payloadRaw ?? {});
      const expected = await hmacSha256Hex(secret, payloadStr);

      let ok = false;
      try {
        ok = timingSafeEqual(hexToBytes(signatureHex), hexToBytes(expected));
      } catch {
        ok = false;
      }
      if (!ok) return json({ ok: false, reason: "invalid_signature" }, 401);

      // Anti-replay: only accept once per signature
      await service.rpc("purge_expired_webhook_signature_nonces", {});
      const { data: existing } = await service
        .from("webhook_signature_nonces")
        .select("id")
        .eq("webhook_id", webhookId)
        .eq("signature_hex", signatureHex)
        .maybeSingle();

      if (existing?.id) return json({ ok: false, reason: "replay_detected" }, 409);

      const expiresAt = new Date(now + maxSkewMs).toISOString();
      await service.from("webhook_signature_nonces").insert({
        webhook_id: webhookId,
        signature_hex: signatureHex,
        timestamp_ms: timestampMs,
        expires_at: expiresAt,
      });

      return json({ ok: true });
    }

    return json({ error: "Unknown action" }, 400);
  } catch (e) {
    console.log("webhook-signature-test: unexpected error", { error: String(e) });
    return json({ error: "Unexpected error" }, 500);
  }
});
