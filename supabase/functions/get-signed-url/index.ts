import { createClient } from "jsr:@supabase/supabase-js@2.94.1";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};

type SingleRequest = {
  filePath: string;
  ttlSeconds?: number;
};

type BatchRequest = {
  filePaths: string[];
  ttlSeconds?: number;
};

function json(data: unknown, status = 200): Response {
  return new Response(JSON.stringify(data), {
    status,
    headers: { ...corsHeaders, "Content-Type": "application/json" },
  });
}

function requireString(v: unknown, name: string) {
  if (typeof v !== "string" || v.trim().length === 0) {
    throw new Error(`${name} inválido`);
  }
  return v.trim();
}

function clampInt(v: unknown, min: number, max: number, fallback: number) {
  if (typeof v !== "number" || !Number.isFinite(v)) return fallback;
  return Math.min(max, Math.max(min, Math.floor(v)));
}

async function getUserIdFromRequest(req: Request) {
  const authHeader = req.headers.get("Authorization");
  if (!authHeader?.startsWith("Bearer ")) {
    return { error: "Unauthorized" as const };
  }

  const token = authHeader.replace("Bearer ", "").trim();
  const SUPABASE_URL = Deno.env.get("SUPABASE_URL") ?? "";
  const SUPABASE_ANON_KEY = Deno.env.get("SUPABASE_ANON_KEY") ?? "";

  if (!SUPABASE_URL || !SUPABASE_ANON_KEY) {
    return { error: "Missing SUPABASE_URL/SUPABASE_ANON_KEY" as const };
  }

  const userClient = createClient(SUPABASE_URL, SUPABASE_ANON_KEY, {
    global: { headers: { Authorization: authHeader } },
  });

  const { data, error } = await userClient.auth.getClaims(token);
  if (error || !data?.claims?.sub) {
    return { error: "Unauthorized" as const };
  }

  return { userId: data.claims.sub, authHeader, userClient };
}

async function buildAdminClient() {
  const SUPABASE_URL = Deno.env.get("SUPABASE_URL") ?? "";
  const SERVICE_ROLE_KEY =
    Deno.env.get("SERVICE_ROLE_KEY") ?? Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") ?? "";

  if (!SUPABASE_URL || !SERVICE_ROLE_KEY) {
    throw new Error("Missing SUPABASE_URL/SERVICE_ROLE_KEY");
  }

  return createClient(SUPABASE_URL, SERVICE_ROLE_KEY);
}

async function ensureUserCanAccessPaths(userClient: any, filePaths: string[]) {
  // Usa RLS do lado do usuário: só retorna registros acessíveis.
  const { data, error } = await userClient
    .from("media_library")
    .select("storage_path")
    .in("storage_path", filePaths);
  if (error) throw error;

  const allowed = new Set((data ?? []).map((r: any) => String(r.storage_path)));
  return allowed;
}

async function getCachedUrl(admin: any, filePath: string, nowIso: string) {
  const { data, error } = await admin
    .from("signed_url_cache")
    .select("signed_url, expires_at")
    .eq("file_path", filePath)
    .gt("expires_at", nowIso)
    .maybeSingle();
  if (error) throw error;
  return data as { signed_url: string; expires_at: string } | null;
}

async function cacheUrl(admin: any, filePath: string, signedUrl: string, expiresAtIso: string) {
  const { error } = await admin
    .from("signed_url_cache")
    .upsert({
      file_path: filePath,
      signed_url: signedUrl,
      expires_at: expiresAtIso,
    });
  if (error) throw error;
}

async function createSignedUrl(admin: any, filePath: string, ttlSeconds: number) {
  const { data, error } = await admin.storage
    .from("media")
    .createSignedUrl(filePath, ttlSeconds);
  if (error) throw error;
  if (!data?.signedUrl) throw new Error("Falha ao gerar signed URL");
  return data.signedUrl as string;
}

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: corsHeaders });
  if (req.method !== "POST") return json({ error: "Method not allowed" }, 405);

  try {
    const auth = await getUserIdFromRequest(req);
    if ("error" in auth) return json({ error: auth.error }, 401);

    const payload = (await req.json()) as SingleRequest | BatchRequest;
    const ttlSeconds = clampInt((payload as any)?.ttlSeconds, 60, 60 * 24, 3600);

    const admin = await buildAdminClient();
    const now = new Date();
    const nowIso = now.toISOString();
    const expiresAtIso = new Date(now.getTime() + ttlSeconds * 1000).toISOString();

    // Batch
    if (Array.isArray((payload as any)?.filePaths)) {
      const filePaths = (payload as BatchRequest).filePaths;
      if (!Array.isArray(filePaths) || filePaths.length === 0) {
        return json({ error: "filePaths inválido" }, 400);
      }
      if (filePaths.length > 50) {
        return json({ error: "Limite de 50 caminhos por requisição" }, 400);
      }

      const normalized = filePaths.map((p, i) => requireString(p, `filePaths[${i}]`));
      const allowed = await ensureUserCanAccessPaths(auth.userClient, normalized);

      const results: Record<string, string> = {};
      const errors: Record<string, string> = {};

      await Promise.all(
        normalized.map(async (filePath) => {
          if (!allowed.has(filePath)) {
            errors[filePath] = "Sem acesso ou arquivo não encontrado";
            return;
          }

          const cached = await getCachedUrl(admin, filePath, nowIso);
          if (cached?.signed_url) {
            results[filePath] = cached.signed_url;
            return;
          }

          const signedUrl = await createSignedUrl(admin, filePath, ttlSeconds);
          await cacheUrl(admin, filePath, signedUrl, expiresAtIso);
          results[filePath] = signedUrl;
        }),
      );

      return json({ ok: true, urls: results, errors, ttlSeconds }, 200);
    }

    // Single
    const filePath = requireString((payload as SingleRequest)?.filePath, "filePath");

    const allowed = await ensureUserCanAccessPaths(auth.userClient, [filePath]);
    if (!allowed.has(filePath)) {
      return json({ error: "Sem acesso ou arquivo não encontrado" }, 404);
    }

    const cached = await getCachedUrl(admin, filePath, nowIso);
    if (cached?.signed_url) {
      return json({ ok: true, signedUrl: cached.signed_url, ttlSeconds, cached: true }, 200);
    }

    const signedUrl = await createSignedUrl(admin, filePath, ttlSeconds);
    await cacheUrl(admin, filePath, signedUrl, expiresAtIso);
    return json({ ok: true, signedUrl, ttlSeconds, cached: false }, 200);
  } catch (e) {
    console.error("[get-signed-url] error:", e);
    return json({ ok: false, error: (e as Error)?.message ?? String(e) }, 500);
  }
});
