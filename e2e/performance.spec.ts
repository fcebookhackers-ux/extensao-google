import { test, expect } from "./fixtures";

test("dashboard should load under 3s (navigation duration)", async ({ authenticatedPage }) => {
  const page = authenticatedPage;

  await page.goto("/dashboard/inicio", { waitUntil: "networkidle" });

  const durationMs = await page.evaluate(() => {
    const nav = performance.getEntriesByType("navigation")[0] as PerformanceNavigationTiming | undefined;
    return nav?.duration ?? null;
  });

  expect(durationMs).not.toBeNull();
  expect(durationMs as number).toBeLessThan(3000);
});
