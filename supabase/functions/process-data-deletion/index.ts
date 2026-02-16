// Processa exclusão/anonimização LGPD em background.
// - Remove arquivos do Storage (media-library + thumbnails)
// - Executa exclusões/anonimizações transacionais via RPC `public.process_data_deletion`
// - Atualiza status e retorna um resumo com contagens

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

function getBearerToken(req: Request) {
  const auth = req.headers.get("authorization") || req.headers.get("Authorization");
  if (!auth) return null;
  const m = auth.match(/^Bearer\s+(.+)$/i);
  return m?.[1] ?? null;
}

function getStoragePathFromPublicUrl(url: string, bucket: string): string | null {
  // Public URLs typically look like:
  // https://<ref>.supabase.co/storage/v1/object/public/<bucket>/<path>
  try {
    const u = new URL(url);
    const needle = `/storage/v1/object/public/${bucket}/`;
    const idx = u.pathname.indexOf(needle);
    if (idx === -1) return null;
    return u.pathname.slice(idx + needle.length);
  } catch {
    return null;
  }
}

async function removeInBatches(
  // Deno typecheck may infer incompatible generic params for SupabaseClient;
  // we keep this helper loosely typed because we only use the Storage API.
  admin: any,
  bucket: string,
  paths: string[],
  batchSize = 100,
) {
  let deleted = 0;
  for (let i = 0; i < paths.length; i += batchSize) {
    const batch = paths.slice(i, i + batchSize).filter(Boolean);
    if (batch.length === 0) continue;
    const { error } = await admin.storage.from(bucket).remove(batch);
    if (error) throw error;
    deleted += batch.length;
  }
  return deleted;
}

async function processDeletion(requestId: string, userId: string) {
  const SUPABASE_URL = Deno.env.get("SUPABASE_URL") ?? "";
  const SERVICE_ROLE_KEY = Deno.env.get("SERVICE_ROLE_KEY") ?? Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") ?? "";
  if (!SUPABASE_URL || !SERVICE_ROLE_KEY) throw new Error("Missing SUPABASE_URL/SERVICE_ROLE_KEY");

  const admin = createClient(SUPABASE_URL, SERVICE_ROLE_KEY);

  console.log("[process-data-deletion] start", { requestId, userId });

  const { data: request, error: requestErr } = await admin
    .from("data_deletion_requests")
    .select("*")
    .eq("id", requestId)
    .single();

  if (requestErr) throw requestErr;
  if (!request) throw new Error("Request not found");
  if (request.user_id !== userId) throw new Error("Forbidden");

  if (request.status === "completed") {
    console.log("[process-data-deletion] already completed", { requestId });
    return { ok: true, already_completed: true, summary: request.metadata?.summary ?? request.metadata ?? {} };
  }

  // Mark attempt
  console.log("[process-data-deletion] mark processing", { requestId });
  const { error: updErr } = await admin
    .from("data_deletion_requests")
    .update({
      status: "processing",
      attempt_count: (request.attempt_count ?? 0) + 1,
      last_attempt_at: new Date().toISOString(),
      error_message: null,
    })
    .eq("id", requestId);
  if (updErr) throw updErr;

  // 1) Storage deletions (best-effort but fail-fast to avoid DB deleting refs while files remain)
  console.log("[process-data-deletion] fetch media_library", { requestId });
  const { data: mediaRows, error: mediaErr } = await admin
    .from("media_library")
    .select("id, storage_path, thumbnail_url")
    .eq("user_id", userId);
  if (mediaErr) throw mediaErr;

  const mediaPaths = (mediaRows ?? []).map((m: any) => String(m.storage_path)).filter(Boolean);
  const thumbPaths = (mediaRows ?? [])
    .map((m: any) => (m.thumbnail_url ? getStoragePathFromPublicUrl(String(m.thumbnail_url), "thumbnails") : null))
    .filter((p: string | null): p is string => !!p);

  console.log("[process-data-deletion] remove storage objects", {
    requestId,
    mediaObjects: mediaPaths.length,
    thumbnailObjects: thumbPaths.length,
  });

  const deleted_media_storage = await removeInBatches(admin, "media-library", mediaPaths);
  const deleted_thumbnails_storage = await removeInBatches(admin, "thumbnails", thumbPaths);

  // 2) Transactional DB operations
  console.log("[process-data-deletion] call RPC process_data_deletion", { requestId });
  const { data: summary, error: rpcErr } = await admin.rpc("process_data_deletion", {
    p_request_id: requestId,
  });
  if (rpcErr) throw rpcErr;

  const finalSummary = {
    ...(typeof summary === "object" && summary ? summary : { summary }),
    deleted_media_storage,
    deleted_thumbnails_storage,
  };

  console.log("[process-data-deletion] done", { requestId });
  return { ok: true, summary: finalSummary };
}

Deno.serve(async (req) => {
  // CORS preflight
  if (req.method === "OPTIONS") return new Response("ok", { headers: corsHeaders });
  if (req.method !== "POST") return json({ error: "Method not allowed" }, 405);

  const token = getBearerToken(req);
  if (!token) return json({ error: "Unauthorized" }, 401);

  const SUPABASE_URL = Deno.env.get("SUPABASE_URL") ?? "";
  const ANON_KEY = Deno.env.get("SUPABASE_ANON_KEY") ?? Deno.env.get("SUPABASE_PUBLISHABLE_KEY") ?? "";
  if (!SUPABASE_URL || !ANON_KEY) return json({ error: "Server misconfigured" }, 500);

  const userClient = createClient(SUPABASE_URL, ANON_KEY, {
    global: { headers: { Authorization: `Bearer ${token}` } },
    auth: { persistSession: false },
  });

  const { data: authData, error: authErr } = await userClient.auth.getUser();
  if (authErr || !authData?.user) return json({ error: "Unauthorized" }, 401);

  let payload: any = null;
  try {
    payload = await req.json();
  } catch {
    return json({ error: "Invalid JSON body" }, 400);
  }

  const requestId = String(payload?.requestId ?? "");
  if (!requestId) return json({ error: "Missing requestId" }, 400);

  // Run as background task (avoid blocking UI) but still return summary when possible.
  // If EdgeRuntime.waitUntil is available, we can accept quickly.
  const job = processDeletion(requestId, authData.user.id).catch(async (e) => {
    console.error("[process-data-deletion] error:", e);
    try {
      const SERVICE_ROLE_KEY = Deno.env.get("SERVICE_ROLE_KEY") ?? Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") ?? "";
      if (SERVICE_ROLE_KEY) {
        const admin = createClient(SUPABASE_URL, SERVICE_ROLE_KEY);
        await admin
          .from("data_deletion_requests")
          .update({
            status: "failed",
            error_message: (e as Error)?.message ?? "unknown error",
            last_attempt_at: new Date().toISOString(),
          })
          .eq("id", requestId);
      }
    } catch (inner) {
      console.error("[process-data-deletion] failed to mark request as failed:", inner);
    }
    throw e;
  });

  const hasWaitUntil = typeof (globalThis as any).EdgeRuntime?.waitUntil === "function";
  if (hasWaitUntil) {
    (globalThis as any).EdgeRuntime.waitUntil(job);
    return json({ accepted: true }, 202);
  }

  // Fallback: process synchronously
  const result = await job;
  return json(result, 200);
});
