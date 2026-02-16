import { validateFileMagicBytes } from "./magic-bytes.ts";
import { sanitizeFileName } from "./sanitize.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.94.0?target=deno";
import { withOtel } from "../_shared/otel.ts";
import { checkRateLimit, rateLimitHeaders } from "../_shared/rate-limit.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type, traceparent, tracestate, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};

type ValidateUploadRequest = {
  fileName: string;
  mimeType: string;
  firstBytesBase64: string; // primeiros bytes do arquivo em base64
  fileSizeBytes?: number;
};

type ValidateUploadResponse = {
  ok: boolean;
  sanitizedFileName?: string;
  error?: string;
  details?: {
    fileSizeBytes?: number;
    quotaUsedBytes?: number;
    quotaLimitBytes?: number;
    remainingBytes?: number;
    fileCount?: number;
    fileCountLimit?: number;
  };
};

const MAX_FILE_SIZE_BYTES = 50 * 1024 * 1024; // 50MB

type UserStorageQuotaRow = {
  total_size_bytes: number;
  max_size_bytes: number;
  file_count: number;
  max_file_count: number;
};

export function isQuotaAvailable(
  quota: UserStorageQuotaRow,
  newFileSizeBytes: number,
): { ok: boolean; reason?: string; details?: ValidateUploadResponse["details"] } {
  if (quota.file_count >= quota.max_file_count) {
    return {
      ok: false,
      reason: `Limite de arquivos atingido (${quota.max_file_count} arquivos)` ,
      details: {
        fileCount: quota.file_count,
        fileCountLimit: quota.max_file_count,
        quotaUsedBytes: quota.total_size_bytes,
        quotaLimitBytes: quota.max_size_bytes,
        remainingBytes: Math.max(quota.max_size_bytes - quota.total_size_bytes, 0),
      },
    };
  }

  const newTotal = quota.total_size_bytes + newFileSizeBytes;
  if (newTotal > quota.max_size_bytes) {
    return {
      ok: false,
      reason: "Quota de armazenamento excedida",
      details: {
        quotaUsedBytes: quota.total_size_bytes,
        quotaLimitBytes: quota.max_size_bytes,
        remainingBytes: Math.max(quota.max_size_bytes - quota.total_size_bytes, 0),
        fileCount: quota.file_count,
        fileCountLimit: quota.max_file_count,
      },
    };
  }

  return {
    ok: true,
    details: {
      quotaUsedBytes: quota.total_size_bytes,
      quotaLimitBytes: quota.max_size_bytes,
      remainingBytes: Math.max(quota.max_size_bytes - quota.total_size_bytes - newFileSizeBytes, 0),
      fileCount: quota.file_count,
      fileCountLimit: quota.max_file_count,
    },
  };
}

function json(body: unknown, status = 200): Response {
  return new Response(JSON.stringify(body), {
    status,
    headers: { ...corsHeaders, "Content-Type": "application/json" },
  });
}

function decodeBase64ToArrayBuffer(base64: string): ArrayBuffer {
  const binary = atob(base64);
  const len = binary.length;
  const bytes = new Uint8Array(len);
  for (let i = 0; i < len; i++) {
    bytes[i] = binary.charCodeAt(i);
  }
  return bytes.buffer;
}

function getServiceRoleKey() {
  return Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") || Deno.env.get("SERVICE_ROLE_KEY") || "";
}

if (import.meta.main) {
  Deno.serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response("ok", { headers: corsHeaders });
  }

  if (req.method !== "POST") {
    return json({ ok: false, error: "Method not allowed" }, 405);
  }

  return await withOtel(req, "validate-upload", async () => {
    const startedAt = performance.now();
    let outcome: "success" | "error" = "error";
    let userId: string | null = null;
    let errorCode: string | null = null;

    try {
    const authHeader = req.headers.get("Authorization");
    if (!authHeader) {
      errorCode = "unauthorized";
      return json({ ok: false, error: "Não autenticado" } satisfies ValidateUploadResponse, 401);
    }

    // Validate JWT + get user
    const supabase = createClient(
      Deno.env.get("SUPABASE_URL")!,
      Deno.env.get("SUPABASE_ANON_KEY")!,
      {
        global: {
          headers: {
            Authorization: authHeader,
          },
        },
      },
    );

    const { data: userData, error: userError } = await supabase.auth.getUser();
    if (userError || !userData.user) {
      console.log("validate-upload: auth error", userError);
      errorCode = "unauthorized";
      return json({ ok: false, error: "Não autenticado" } satisfies ValidateUploadResponse, 401);
    }

    userId = userData.user.id;

    // Rate limit (fallback per-user; workspace tier not resolved in this phase)
    const rl = await checkRateLimit({
      endpoint: "validate-upload",
      limitType: "per_user",
      identifier: userData.user.id,
      tier: "free",
    });
    if (!rl.allowed) {
      errorCode = "rate_limited";
      return new Response(
        JSON.stringify({ ok: false, error: "Rate limit exceeded", resetAt: rl.resetAt }),
        {
          status: 429,
          headers: { ...corsHeaders, "Content-Type": "application/json", ...rateLimitHeaders(rl) },
        },
      );
    }

    const payload = (await req.json()) as ValidateUploadRequest;

    if (!payload?.fileName || !payload?.mimeType || !payload?.firstBytesBase64) {
      console.log("validate-upload: invalid payload", payload);
      errorCode = "invalid_payload";
      return json({ ok: false, error: "Payload inválido para validação" }, 400);
    }

    // Enforce max size server-side (client must send fileSizeBytes)
    const fileSizeBytes = payload.fileSizeBytes;
    if (typeof fileSizeBytes === "number" && fileSizeBytes > MAX_FILE_SIZE_BYTES) {
      errorCode = "file_too_large";
      return json(
        {
          ok: false,
          error: `Arquivo excede tamanho máximo de ${Math.round(MAX_FILE_SIZE_BYTES / 1024 / 1024)}MB`,
          details: { fileSizeBytes },
        } satisfies ValidateUploadResponse,
        400,
      );
    }

    const sanitizedFileName = sanitizeFileName(payload.fileName);

    let buffer: ArrayBuffer;
    try {
      buffer = decodeBase64ToArrayBuffer(payload.firstBytesBase64);
    } catch (e) {
      console.log("validate-upload: base64 decode error", e);
      errorCode = "base64_decode_failed";
      return json({ ok: false, error: "Falha ao decodificar bytes do arquivo" }, 400);
    }

    const { valid, reason } = validateFileMagicBytes(buffer, payload.mimeType);

    if (!valid) {
      console.log("validate-upload: invalid magic bytes", {
        mimeType: payload.mimeType,
        reason,
      });
      errorCode = "invalid_magic_bytes";
      return json(
        {
          ok: false,
          error:
            reason ??
            "O arquivo parece estar corrompido ou não corresponde ao tipo informado.",
        } satisfies ValidateUploadResponse,
        400,
      );
    }

    // Enforce quota server-side (best-effort; require fileSizeBytes)
    if (typeof fileSizeBytes === "number") {
      const { data: quota, error: quotaError } = await supabase
        .from("user_storage_quotas")
        .select("total_size_bytes,max_size_bytes,file_count,max_file_count")
        .eq("user_id", userData.user.id)
        .single();

      if (quotaError) {
        console.log("validate-upload: quota check failed", quotaError);
        errorCode = "quota_check_failed";
        return json(
          {
            ok: false,
            error: "Erro ao verificar quota de armazenamento",
            details: { fileSizeBytes },
          } satisfies ValidateUploadResponse,
          500,
        );
      }

      const quotaResult = isQuotaAvailable(quota as UserStorageQuotaRow, fileSizeBytes);
      if (!quotaResult.ok) {
        errorCode = "quota_exceeded";
        return json(
          {
            ok: false,
            error: quotaResult.reason ?? "Quota de armazenamento excedida",
            details: {
              fileSizeBytes,
              ...quotaResult.details,
            },
          } satisfies ValidateUploadResponse,
          400,
        );
      }

      outcome = "success";
      return new Response(
        JSON.stringify(
        {
          ok: true,
          sanitizedFileName,
          details: {
            fileSizeBytes,
            ...quotaResult.details,
          },
        } satisfies ValidateUploadResponse,
        ),
        {
          headers: { ...corsHeaders, "Content-Type": "application/json", ...rateLimitHeaders(rl) },
        },
      );
    }

    outcome = "success";
    return new Response(
      JSON.stringify({ ok: true, sanitizedFileName, details: { fileSizeBytes } } satisfies ValidateUploadResponse),
      { headers: { ...corsHeaders, "Content-Type": "application/json", ...rateLimitHeaders(rl) } },
    );
    } catch (e) {
      console.log("validate-upload: unexpected error", e);
      errorCode = "unexpected_error";
      return json(
        {
          ok: false,
          error: "Erro inesperado ao validar o arquivo. Tente novamente.",
        } satisfies ValidateUploadResponse,
        500,
      );
    } finally {
      // Best-effort instrumentation for SLIs/SLOs (service role only)
      if (userId) {
        const durationMs = Math.max(0, Math.round(performance.now() - startedAt));
        try {
          const supabaseUrl = Deno.env.get("SUPABASE_URL") ?? "";
          const serviceRoleKey = getServiceRoleKey();
          if (supabaseUrl && serviceRoleKey) {
            const admin = createClient(supabaseUrl, serviceRoleKey);
            await admin.from("upload_events").insert({
              user_id: userId,
              workspace_id: null,
              status: outcome,
              validation_duration_ms: durationMs,
              error_code: outcome === "success" ? null : errorCode ?? "error",
            });
          }
        } catch (err) {
          console.log("validate-upload: failed to insert upload_events", { error: String(err) });
        }
      }
    }
  });
  });
}
