import { supabase } from "@/integrations/supabase/client";
import type { RateLimitEndpoint, RateLimitResult } from "@/types/rate-limit";
import { RateLimitError } from "@/types/rate-limit";

export async function checkRateLimit(
  endpoint: RateLimitEndpoint,
  customLimits?: {
    maxRequests?: number;
    windowSeconds?: number;
  },
): Promise<RateLimitResult> {
  const { data, error } = await supabase.rpc("check_rate_limit", {
    p_endpoint: endpoint,
    p_custom_max_requests: customLimits?.maxRequests ?? null,
    p_custom_window_seconds: customLimits?.windowSeconds ?? null,
  });

  if (error) {
    console.error("Rate limit check failed:", error);
    // Fail-open (como solicitado): não bloqueia o usuário se o backend estiver instável.
    return {
      allowed: true,
      remaining: 999,
      reset_at: new Date(Date.now() + 3600_000).toISOString(),
    };
  }

  const row = Array.isArray(data) ? data[0] : null;
  return (row ?? {
    allowed: true,
    remaining: 999,
    reset_at: new Date(Date.now() + 3600_000).toISOString(),
  }) as RateLimitResult;
}

export async function enforceRateLimit(
  endpoint: RateLimitEndpoint,
  customLimits?: {
    maxRequests?: number;
    windowSeconds?: number;
  },
): Promise<void> {
  // Em desenvolvimento, não bloqueia por rate limit (evita travar testes locais).
  if (import.meta.env.DEV) return;

  const result = await checkRateLimit(endpoint, customLimits);

  if (!result.allowed) {
    const resetAt = new Date(result.reset_at);
    const waitTime = Math.ceil((resetAt.getTime() - Date.now()) / 1000);

    throw new RateLimitError(
      `Limite de requisições excedido. Tente novamente em ${waitTime} segundos.`,
      resetAt,
      result.remaining,
    );
  }
}

export function formatResetTime(resetAt: Date): string {
  const now = new Date();
  const diff = resetAt.getTime() - now.getTime();
  if (diff < 0) return "agora";

  const seconds = Math.ceil(diff / 1000);
  const minutes = Math.floor(seconds / 60);
  const hours = Math.floor(minutes / 60);

  if (hours > 0) return `${hours}h ${minutes % 60}min`;
  if (minutes > 0) return `${minutes}min ${seconds % 60}s`;
  return `${seconds}s`;
}
