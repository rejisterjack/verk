import type { Page } from "@playwright/test";

export async function loginAsDemo(page: Page) {
  await page.goto("/login");
  await page.getByLabel("Email").fill("demo@verk.dev");
  await page.getByLabel("Password").fill("demo1234");
  await page.getByRole("button", { name: /sign in/i }).click();
  await page.waitForURL(/\/(onboarding|t\/)/);
}
