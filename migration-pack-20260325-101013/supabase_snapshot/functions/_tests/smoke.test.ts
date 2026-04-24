import { assertEquals } from "std/assert/mod.ts";

// Smoke test: import map resolves the Supabase client alias.
Deno.test("Edge Functions: imports resolve corretamente", async () => {
  const { createClient } = await import("supabase");
  assertEquals(typeof createClient, "function");
});

const CRITICAL_FUNCTIONS = [
  "validate-upload",
  "execute-webhook",
  "process-data-export",
  "validate-webhook-url",
] as const;

for (const funcName of CRITICAL_FUNCTIONS) {
  Deno.test(`Edge Function: ${funcName} compila`, async () => {
    try {
      // From supabase/functions/_tests -> supabase/functions/<func>/index.ts
      await import(`../${funcName}/index.ts`);
    } catch (error) {
      const message = error instanceof Error ? error.message : String(error);
      throw new Error(`Failed to compile ${funcName}: ${message}`);
    }
  });
}
