import "std/dotenv/load.ts";

import { assertEquals } from "std/assert/mod.ts";

const SUPABASE_URL = Deno.env.get("SUPABASE_URL") ?? Deno.env.get("VITE_SUPABASE_URL") ?? "";
const SERVICE_ROLE_KEY =
  Deno.env.get("SERVICE_ROLE_KEY") ?? Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") ?? "";

function restUrl(path: string) {
  if (!SUPABASE_URL) throw new Error("Missing SUPABASE_URL/VITE_SUPABASE_URL in env");
  return `${SUPABASE_URL.replace(/\/$/, "")}/rest/v1/${path.replace(/^\//, "")}`;
}

async function restFetch(path: string, init: RequestInit) {
  if (!SERVICE_ROLE_KEY) throw new Error("Missing SERVICE_ROLE_KEY/SUPABASE_SERVICE_ROLE_KEY in env");
  const res = await fetch(restUrl(path), {
    ...init,
    headers: {
      apikey: SERVICE_ROLE_KEY,
      Authorization: `Bearer ${SERVICE_ROLE_KEY}`,
      "Content-Type": "application/json",
      ...(init.headers ?? {}),
    },
  });
  return res;
}

Deno.test({
  name: "rate limit v2 blocks after max_requests (requires service role key)",
  ignore: !SERVICE_ROLE_KEY,
  fn: async () => {
  // Upsert a deterministic rule
  const rule = {
    endpoint: "test-endpoint",
    limit_type: "per_user",
    max_requests: 2,
    window_seconds: 60,
    tier: "free",
    is_active: true,
  };

  const upsert = await restFetch(
    "rate_limit_rules_v2?on_conflict=endpoint,limit_type,tier",
    {
      method: "POST",
      headers: {
        Prefer: "resolution=merge-duplicates,return=representation",
      },
      body: JSON.stringify(rule),
    },
  );
  await upsert.text();
  assertEquals(upsert.ok, true);

  // Call RPC 3x within the same window
  const call = async () => {
    const res = await restFetch("rpc/check_rate_limit_v2", {
      method: "POST",
      body: JSON.stringify({
        p_endpoint: "test-endpoint",
        p_limit_type: "per_user",
        p_identifier: "user-1",
        p_tier: "free",
      }),
    });
    const json = await res.json();
    return json as { allowed: boolean; remaining: number; reset_at: string };
  };

  const r1 = await call();
  const r2 = await call();
  const r3 = await call();

  assertEquals(r1.allowed, true);
  assertEquals(r2.allowed, true);
  assertEquals(r3.allowed, false);
  },
});
