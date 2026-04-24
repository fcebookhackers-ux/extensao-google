// Processa exportações de dados em background e grava o arquivo no Supabase Storage (bucket: exports).
// IMPORTANTE: não armazenar arquivos no banco; apenas URL assinada em data_export_requests.

import { createClient } from "jsr:@supabase/supabase-js@2.94.1";
import { requireAuth } from "../_shared/auth-helpers.ts";
import { checkRateLimit, rateLimitHeaders } from "../_shared/rate-limit.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};

type Json = string | number | boolean | null | { [key: string]: Json | undefined } | Json[];

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

function getBearerToken(req: Request) {
  const auth = req.headers.get("authorization") || req.headers.get("Authorization");
  if (!auth) return null;
  const m = auth.match(/^Bearer\s+(.+)$/i);
  return m?.[1] ?? null;
}

async function processExport(requestId: string, userId: string) {
  const SUPABASE_URL = Deno.env.get("SUPABASE_URL") ?? "";
  const SERVICE_ROLE_KEY = Deno.env.get("SERVICE_ROLE_KEY") ?? Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") ?? "";
  if (!SUPABASE_URL || !SERVICE_ROLE_KEY) throw new Error("Missing SUPABASE_URL/SERVICE_ROLE_KEY");

  const admin = createClient(SUPABASE_URL, SERVICE_ROLE_KEY);

  // Busca solicitação (service role)
  const { data: request, error: requestErr } = await admin
    .from("data_export_requests")
    .select("*")
    .eq("id", requestId)
    .single();
  if (requestErr) throw requestErr;
  if (!request) throw new Error("Request not found");
  if (request.user_id !== userId) throw new Error("Forbidden");

  // Atualiza status para processing
  const { error: upd1 } = await admin
    .from("data_export_requests")
    .update({ status: "processing" })
    .eq("id", requestId);
  if (upd1) throw upd1;

  // Coleta dados do usuário (sem armazenar binário no DB)
  const [automations, consents] = await Promise.all([
    admin.from("automations").select("*").eq("user_id", userId),
    admin.from("consent_history").select("*").eq("user_id", userId),
  ]);

  const exportData: Record<string, Json> = {
    user_id: userId,
    exported_at: new Date().toISOString(),
    automations: (automations.data ?? []) as unknown as Json,
    consent_history: (consents.data ?? []) as unknown as Json,
  };

  const jsonData = JSON.stringify(exportData, null, 2);
  const bytes = new TextEncoder().encode(jsonData);
  const filePath = `${userId}/zapfllow-data-export-${requestId}.json`;

  const { error: uploadError } = await admin.storage.from("exports").upload(filePath, bytes, {
    contentType: "application/json",
    upsert: true,
  });
  if (uploadError) throw uploadError;

  // Gera URL assinada por 7 dias
  const { data: urlData, error: urlError } = await admin.storage.from("exports").createSignedUrl(filePath, 60 * 60 * 24 * 7);
  if (urlError) throw urlError;

  const expiresAt = new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString();

  const { error: upd2 } = await admin
    .from("data_export_requests")
    .update({
      status: "completed",
      completed_at: new Date().toISOString(),
      download_url: urlData?.signedUrl ?? null,
      expires_at: expiresAt,
      file_path: filePath,
      file_size_bytes: bytes.byteLength,
    })
    .eq("id", requestId);
  if (upd2) throw upd2;
}

if (import.meta.main) {
  Deno.serve(async (req) => {
  // Handle CORS preflight
  if (req.method === "OPTIONS") return new Response("ok", { headers: corsHeaders });
  if (req.method !== "POST") return json({ error: "Method not allowed" }, 405);

  let auth: { userId: string };
  try {
    auth = await requireAuth(req, corsHeaders);
  } catch (e) {
    if (e instanceof Response) return e;
    throw e;
  }

  const rl = await checkRateLimit({
    endpoint: "process-data-export",
    limitType: "per_user",
    identifier: auth.userId,
    tier: "free",
  });
  if (!rl.allowed) {
    return json(
      { error: "Rate limit exceeded", resetAt: rl.resetAt },
      429,
      rateLimitHeaders(rl),
    );
  }

  const SUPABASE_URL = Deno.env.get("SUPABASE_URL") ?? "";
  const ANON_KEY = Deno.env.get("SUPABASE_ANON_KEY") ?? Deno.env.get("SUPABASE_PUBLISHABLE_KEY") ?? "";
  if (!SUPABASE_URL || !ANON_KEY) return json({ error: "Server misconfigured" }, 500);

  // auth já validado via getClaims (signing-keys compatible)

  let payload: any = null;
  try {
    payload = await req.json();
  } catch {
    return json({ error: "Invalid JSON body" }, 400);
  }

  const requestId = String(payload?.requestId ?? "");
  if (!requestId) return json({ error: "Missing requestId" }, 400);

  // Run async to avoid blocking UI
  const job = processExport(requestId, auth.userId).catch(async (e) => {
    console.error("process-data-export error:", e);
    try {
      const SERVICE_ROLE_KEY = Deno.env.get("SERVICE_ROLE_KEY") ?? Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") ?? "";
      const admin = createClient(SUPABASE_URL, SERVICE_ROLE_KEY);
      await admin
        .from("data_export_requests")
        .update({ status: "failed", error_message: (e as Error)?.message ?? "unknown error" })
        .eq("id", requestId);
    } catch (inner) {
      console.error("failed to mark request as failed:", inner);
    }
  });

  // Prefer EdgeRuntime.waitUntil when available; otherwise fire-and-forget.
  (globalThis as any).EdgeRuntime?.waitUntil?.(job);

  return json({ accepted: true }, 202, rateLimitHeaders(rl));
  });
}
