import "std/dotenv/load.ts";

import { assertEquals } from "std/assert/mod.ts";

const SUPABASE_URL = Deno.env.get("VITE_SUPABASE_URL") ?? Deno.env.get("SUPABASE_URL") ?? "";

function functionsUrl(path: string) {
  if (!SUPABASE_URL) throw new Error("Missing VITE_SUPABASE_URL/SUPABASE_URL in env");
  return `${SUPABASE_URL.replace(/\/$/, "")}/functions/v1/${path.replace(/^\//, "")}`;
}

Deno.test("Edge Function rejects requests without token", async () => {
  const res = await fetch(functionsUrl("execute-webhook"), {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ webhook_id: "test-id", event_type: "test", payload: { ok: true } }),
  });
  await res.text();
  assertEquals(res.status, 401);
});

Deno.test("Edge Function rejects invalid token", async () => {
  const res = await fetch(functionsUrl("execute-webhook"), {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: "Bearer invalid-token-here",
    },
    body: JSON.stringify({ webhook_id: "test-id", event_type: "test", payload: { ok: true } }),
  });
  await res.text();
  assertEquals(res.status, 401);
});

// This requires seeded users/workspaces on the target environment.
Deno.test({
  name: "Edge Function rejects user from different workspace (requires fixtures)",
  ignore: true,
  fn: async () => {},
});
