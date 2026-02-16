import { assertEquals } from "https://deno.land/std@0.224.0/assert/mod.ts";

import { isQuotaAvailable } from "./index.ts";

Deno.test("isQuotaAvailable blocks when file count limit reached", () => {
  const res = isQuotaAvailable(
    {
      total_size_bytes: 100,
      max_size_bytes: 1000,
      file_count: 10,
      max_file_count: 10,
    },
    1,
  );

  assertEquals(res.ok, false);
});

Deno.test("isQuotaAvailable blocks when exceeding size quota", () => {
  const res = isQuotaAvailable(
    {
      total_size_bytes: 900,
      max_size_bytes: 1000,
      file_count: 1,
      max_file_count: 100,
    },
    200,
  );

  assertEquals(res.ok, false);
});

Deno.test("isQuotaAvailable allows when within quota", () => {
  const res = isQuotaAvailable(
    {
      total_size_bytes: 100,
      max_size_bytes: 1000,
      file_count: 1,
      max_file_count: 100,
    },
    200,
  );

  assertEquals(res.ok, true);
});
