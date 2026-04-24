import { assertEquals } from "https://deno.land/std@0.224.0/assert/mod.ts";

import { validateWebhookUrl } from "../_shared/ssrf-protection.ts";

Deno.test("blocks non-https", async () => {
  const res = await validateWebhookUrl("http://example.com/webhook");
  assertEquals(res.isValid, false);
});

Deno.test("blocks loopback and localhost", async () => {
  const cases = [
    "https://127.0.0.1/webhook",
    "https://localhost/webhook",
    "https://[::1]/webhook",
  ];

  for (const url of cases) {
    const res = await validateWebhookUrl(url);
    assertEquals(res.isValid, false, url);
  }
});

Deno.test("blocks private ranges", async () => {
  const cases = [
    "https://10.0.0.1/webhook",
    "https://192.168.1.1/webhook",
    "https://172.16.0.1/webhook",
    "https://169.254.169.254/webhook",
  ];

  for (const url of cases) {
    const res = await validateWebhookUrl(url);
    assertEquals(res.isValid, false, url);
  }
});

Deno.test("blocks embedded credentials", async () => {
  const res = await validateWebhookUrl("https://user:pass@example.com/webhook");
  assertEquals(res.isValid, false);
});

Deno.test("blocks sensitive ports", async () => {
  const res = await validateWebhookUrl("https://example.com:5432/webhook");
  assertEquals(res.isValid, false);
});
