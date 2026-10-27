import { expect, test } from "@playwright/test";

test("marketing home renders", async ({ page }) => {
  await page.goto("/");
  await expect(page.getByRole("heading", { level: 1 })).toContainText("Linear UX");
});

test("login page renders", async ({ page }) => {
  await page.goto("/login");
  await expect(page.getByRole("heading", { name: /log in/i })).toBeVisible();
});

test("demo credentials can open issues", async ({ page }) => {
  await page.goto("/login");
  await page.getByLabel("Email").fill("demo@verk.dev");
  await page.getByLabel("Password").fill("demo1234");
  await page.getByRole("button", { name: /sign in/i }).click();
  await page.waitForURL(/\/(onboarding|t\/)/);
  if (page.url().includes("/onboarding")) {
    // Should auto-redirect when memberships exist; if not, fail clearly
    await expect(page).not.toHaveURL(/onboarding/);
  }
  await page.goto("/t/acme-engineering/issues");
  await expect(page.getByRole("heading", { name: "Issues" })).toBeVisible();
});
