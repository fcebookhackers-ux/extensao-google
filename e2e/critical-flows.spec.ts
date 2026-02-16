import { test, expect } from "./fixtures";

test.describe("Critical User Flows", () => {
  test("should login and reach dashboard", async ({ authenticatedPage }) => {
    const page = authenticatedPage;

    await expect(page).toHaveURL(/\/dashboard/);
    await expect(page.getByText("Pressione")).toBeVisible();
  });

  test("should navigate between dashboard routes", async ({ authenticatedPage }) => {
    const page = authenticatedPage;

    // Sidebar links
    await page.getByRole("link", { name: "Automações" }).hover();
    await page.getByRole("link", { name: "Automações" }).click();
    await expect(page).toHaveURL(/\/dashboard\/automacoes/);

    await page.getByRole("link", { name: "Analytics" }).hover();
    await page.getByRole("link", { name: "Analytics" }).click();
    await expect(page).toHaveURL(/\/dashboard\/analytics/);
    await expect(page.getByRole("heading", { name: "Analytics" })).toBeVisible();
  });
});
