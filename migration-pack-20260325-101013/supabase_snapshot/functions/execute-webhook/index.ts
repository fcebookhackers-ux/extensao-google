// Edge Function: execute-webhook
// Applies optional conditions + payload transformation, then POSTs to the webhook URL.

import { createClient } from "jsr:@supabase/supabase-js@2.94.1";
import { requireAuth } from "../_shared/auth-helpers.ts";
import { checkRateLimit, rateLimitHeaders } from "../_shared/rate-limit.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};

type ExecuteWebhookRequest = {
  webhook_id: string;
  event_type: string;
  payload: Record<string, unknown>;
  timestamp?: string;
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

function getByPath(obj: unknown, path: string): unknown {
  if (!path) return undefined;
  const parts = path.split(".").filter(Boolean);
  let cur: any = obj;
  for (const p of parts) {
    if (cur == null) return undefined;
    cur = cur[p];
  }
  return cur;
}

function applyTemplateString(str: string, ctx: Record<string, unknown>) {
  return str.replace(/\{\{\s*([^}]+?)\s*\}\}/g, (_m, rawPath: string) => {
    const path = String(rawPath);
    const v = getByPath(ctx, path);
    if (v === undefined || v === null) return "";
    if (typeof v === "string") return v;
    try {
      return JSON.stringify(v);
    } catch {
      return String(v);
    }
  });
}

function applyTemplateValue(value: unknown, ctx: Record<string, unknown>): unknown {
  if (typeof value === "string") return applyTemplateString(value, ctx);
  if (Array.isArray(value)) return value.map((v) => applyTemplateValue(v, ctx));
  if (value && typeof value === "object") {
    const out: Record<string, unknown> = {};
    for (const [k, v] of Object.entries(value as Record<string, unknown>)) {
      out[k] = applyTemplateValue(v, ctx);
    }
    return out;
  }
  return value;
}

async function fetchWithTimeout(url: string, init: RequestInit, timeoutMs: number) {
  const startTime = performance.now();
  const controller = new AbortController();
  const id = setTimeout(() => controller.abort(), timeoutMs);
  try {
    const res = await fetch(url, { ...init, signal: controller.signal });
    const text = await res.text();
    const duration = Math.round(performance.now() - startTime);
    return { status: res.status, ok: res.ok, body: text, durationMs: duration };
  } catch (err) {
    const duration = Math.round(performance.now() - startTime);
    throw new Error(`Fetch failed: ${String(err)} (duration: ${duration}ms)`);
  } finally {
    clearTimeout(id);
  }
}

if (import.meta.main) {
  Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: corsHeaders });

  try {
    const supabaseUrl = Deno.env.get("SUPABASE_URL");
    const supabaseAnonKey = Deno.env.get("SUPABASE_ANON_KEY");
    const serviceRoleKey = Deno.env.get("SERVICE_ROLE_KEY");
    if (!supabaseUrl || !supabaseAnonKey) {
      console.log("execute-webhook: missing env SUPABASE_URL/SUPABASE_ANON_KEY");
      return json({ error: "Server misconfigured" }, 500);
    }
    if (!serviceRoleKey) {
      console.log("execute-webhook: missing env SERVICE_ROLE_KEY");
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

    const supabaseAdmin = createClient(supabaseUrl, serviceRoleKey);

    const body = (await req.json().catch(() => null)) as ExecuteWebhookRequest | null;
    if (!body?.webhook_id || !body?.event_type || !body?.payload) {
      return json({ error: "Missing webhook_id, event_type or payload" }, 400);
    }

    const envelope = {
      event_type: body.event_type,
      timestamp: body.timestamp ?? new Date().toISOString(),
      data: body.payload,
    };

    const { data: webhook, error: webhookError } = await supabase
      .from("webhooks")
      .select(
        "id,user_id,workspace_id,name,url,headers,is_active,timeout_seconds,enable_conditions,enable_transformation,transformation_script,payload_template",
      )
      .eq("id", body.webhook_id)
      .single();

    if (webhookError || !webhook) {
      console.log("execute-webhook: webhook not found", { webhook_id: body.webhook_id, webhookError });
      return json({ error: "Webhook not found" }, 404);
    }

    if (!webhook.is_active) {
      return json({ skipped: true, reason: "Webhook inactive" }, 200);
    }

    // Ownership check (defense-in-depth)
    if (webhook.user_id !== userId) {
      return json({ error: "Forbidden" }, 403);
    }

    // Rate limit (per-workspace when available; fallback to user)
    const identifier = String((webhook as any).workspace_id ?? userId);
    const limitType = (webhook as any).workspace_id ? "per_workspace" : "per_user";
    const rl = await checkRateLimit({ endpoint: "execute-webhook", limitType, identifier, tier: "free" });
    if (!rl.allowed) {
      return json(
        { error: "Rate limit exceeded", resetAt: rl.resetAt },
        429,
        rateLimitHeaders(rl),
      );
    }

    // Conditions
    if (webhook.enable_conditions) {
      const { data: shouldSend, error: condError } = await supabase.rpc("evaluate_webhook_conditions", {
        p_webhook_id: body.webhook_id,
        p_payload: envelope,
      });

      if (condError) {
        console.log("execute-webhook: condition eval error", { condError });
        // Fail open: send anyway (safer for integrations), but caller can see the warning.
      } else if (shouldSend === false) {
        console.log("execute-webhook: skipped by conditions", { webhook_id: body.webhook_id });
        return json({ skipped: true, reason: "Conditions not met" }, 200);
      }
    }

    // Transformation (safe DSL)
    let finalPayload: unknown = envelope;
    if (webhook.enable_transformation) {
      const raw = (webhook.transformation_script || webhook.payload_template) as any;
      if (raw) {
        try {
          const templateObj = typeof raw === "string" ? JSON.parse(raw) : raw;
          finalPayload = applyTemplateValue(templateObj, envelope);
        } catch (e) {
          console.log("execute-webhook: transform failed, sending original", { error: String(e) });
          finalPayload = envelope;
        }
      }
    }

    const headers = {
      "Content-Type": "application/json",
      ...(webhook.headers ?? {}),
    } as Record<string, string>;

    // Standard delivery headers
    const timestampMs = Date.now().toString();
    headers["X-Webhook-Id"] = String(body.webhook_id);
    headers["X-Webhook-Timestamp"] = timestampMs;

    // Vault secret: attach current secret (and previous during grace) as headers.
    // Receiver can validate either header during the 7-day grace window.
    try {
      const { data: secretsData, error: secretsError } = await supabaseAdmin.rpc(
        "get_webhook_secrets_for_delivery",
        { p_webhook_id: body.webhook_id },
      );

      if (!secretsError && secretsData?.current) {
        headers["X-Webhook-Secret"] = String(secretsData.current);
      }
      if (!secretsError && secretsData?.previous) {
        headers["X-Webhook-Secret-Previous"] = String(secretsData.previous);
      }

      // Signature (HMAC-SHA256 hex) over the actual body we send
      if (!secretsError && secretsData?.current) {
        try {
          const enc = new TextEncoder();
          const key = await crypto.subtle.importKey(
            "raw",
            enc.encode(String(secretsData.current)),
            { name: "HMAC", hash: "SHA-256" },
            false,
            ["sign"],
          );
          const bodyToSign = JSON.stringify(finalPayload);
          const sig = await crypto.subtle.sign("HMAC", key, enc.encode(bodyToSign));
          const hex = Array.from(new Uint8Array(sig))
            .map((b) => b.toString(16).padStart(2, "0"))
            .join("");
          headers["X-Webhook-Signature"] = hex;
        } catch (e) {
          console.log("execute-webhook: failed to sign payload", { error: String(e) });
        }
      }
    } catch (e) {
      console.log("execute-webhook: failed to attach vault secret", { error: String(e) });
    }

    const timeoutSeconds = Number(webhook.timeout_seconds ?? 10);

    let success = false;
    let statusCode: number | null = null;
    let errorMessage: string | null = null;
    let responseBody: string | null = null;
    let durationMs = 0;

    try {
      const result = await fetchWithTimeout(
        webhook.url,
        {
          method: "POST",
          headers,
          body: JSON.stringify(finalPayload),
        },
        Math.max(1, Math.min(timeoutSeconds, 30)) * 1000,
      );

      statusCode = result.status;
      responseBody = result.body;
      durationMs = result.durationMs;
      success = result.ok;
    } catch (err) {
      errorMessage = String(err);
      // Extract duration from error if available
      const match = errorMessage.match(/duration: (\d+)ms/);
      if (match) durationMs = parseInt(match[1], 10);
    }

    // Save log entry
    const { error: logError } = await supabase
      .from("webhook_logs")
      .insert({
        webhook_id: body.webhook_id,
        event_type: body.event_type,
        payload: envelope,
        response_status: statusCode,
        response_body: responseBody,
        error_message: errorMessage,
        success,
        duration_ms: durationMs,
        attempt_number: 1,
      });

    if (logError) {
      console.log("execute-webhook: failed to log execution", { logError });
    }

    // Update circuit breaker
    await supabase.rpc("record_webhook_execution", {
      p_webhook_id: body.webhook_id,
      p_success: success,
    });

    // If failed, check retry
    if (!success) {
      await supabase.rpc("enqueue_webhook_retry", {
        p_webhook_id: body.webhook_id,
        p_webhook_log_id: null,
        p_event_type: body.event_type,
        p_payload: envelope,
        p_status_code: statusCode,
        p_error_message: errorMessage,
      });
    }

    return json(
      {
        ok: success,
        status: statusCode,
        response_body: responseBody,
        duration_ms: durationMs,
      },
      200,
      rateLimitHeaders(rl),
    );
  } catch (e) {
    console.log("execute-webhook: unexpected error", e);
    return json({ error: "Unexpected error" }, 500);
  }
  });
}
