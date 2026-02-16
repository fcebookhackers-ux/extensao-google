import { createClient } from "https://esm.sh/@supabase/supabase-js@2.94.0?target=deno";

export type RateLimitResult = {
  allowed: boolean;
  remaining: number;
  resetAt: string;
};

function getEnv(name: string) {
  const v = Deno.env.get(name);
  if (!v) throw new Error(`Missing env var: ${name}`);
  return v;
}

function getServiceRoleKey() {
  return Deno.env.get("SERVICE_ROLE_KEY") ?? Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") ?? "";
}

export async function checkRateLimit(params: {
  endpoint: string;
  limitType: "per_user" | "per_workspace" | "per_ip";
  identifier: string;
  tier?: string;
}): Promise<RateLimitResult> {
  const supabaseUrl = getEnv("SUPABASE_URL");
  const serviceRoleKey = getServiceRoleKey();
  if (!serviceRoleKey) {
    // fail-open
    return { allowed: true, remaining: 999, resetAt: new Date(Date.now() + 3600_000).toISOString() };
  }

  const admin = createClient(supabaseUrl, serviceRoleKey, { auth: { persistSession: false } });

  const { data, error } = await admin
    .rpc("check_rate_limit_v2", {
      p_endpoint: params.endpoint,
      p_limit_type: params.limitType,
      p_identifier: params.identifier,
      p_tier: params.tier ?? "free",
    })
    .single();

  if (error || !data) {
    console.error("rate-limit: check failed", { error });
    // fail-open
    return { allowed: true, remaining: 999, resetAt: new Date(Date.now() + 3600_000).toISOString() };
  }

  return {
    allowed: Boolean((data as any).allowed),
    remaining: Number((data as any).remaining ?? 0),
    resetAt: String((data as any).reset_at ?? new Date(Date.now() + 3600_000).toISOString()),
  };
}

export function rateLimitHeaders(result: RateLimitResult) {
  return {
    "X-RateLimit-Remaining": String(result.remaining),
    "X-RateLimit-Reset": result.resetAt,
  } as Record<string, string>;
}
