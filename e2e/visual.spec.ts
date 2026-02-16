import { test, expect } from "./fixtures";

test("visual regression - dashboard pages", async ({ authenticatedPage }) => {
  const page = authenticatedPage;

  // Reduz flakiness visual (animações/transições)
  await page.addStyleTag({
    content:
      "*{animation-duration:0s!important;transition-duration:0s!important}html{scroll-behavior:auto!important}",
  });

  await page.goto("/dashboard/inicio");
  await expect(page).toHaveScreenshot("dashboard-inicio.png", { fullPage: true });

  await page.goto("/dashboard/automacoes");
  await expect(page).toHaveScreenshot("dashboard-automacoes.png", { fullPage: true });
});
