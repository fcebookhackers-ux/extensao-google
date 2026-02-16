import { test as base, expect, type Page } from "@playwright/test";

type Fixtures = {
  authenticatedPage: Page;
};

export const test = base.extend<Fixtures>({
  authenticatedPage: async ({ page }, use) => {
    const email = process.env.E2E_USER_EMAIL;
    const password = process.env.E2E_USER_PASSWORD;

    if (!email || !password) {
      throw new Error(
        "Missing E2E_USER_EMAIL/E2E_USER_PASSWORD. Configure env vars (CI secrets) to run authenticated tests.",
      );
    }

    await page.goto("/login");

    await page.getByLabel("Email").fill(email);
    await page.getByLabel("Senha").fill(password);
    await page.locator('button[type="submit"]').click();

    // Login redireciona para /dashboard/inicio (ver src/pages/Login.tsx)
    await page.waitForURL(/\/dashboard(\/inicio)?/, { timeout: 30_000 });
    await use(page);
  },
});

export { expect };
