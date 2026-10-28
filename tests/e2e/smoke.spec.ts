import { expect, test } from "@playwright/test";

import { loginAsDemo } from "./helpers/auth";

test("marketing home renders", async ({ page }) => {
  await page.goto("/");
  await expect(page.getByRole("heading", { level: 1 })).toContainText(
    "Linear UX",
  );
});

test("login page renders", async ({ page }) => {
  await page.goto("/login");
  await expect(page.getByRole("heading", { name: /log in/i })).toBeVisible();
});

test("demo credentials can open issues", async ({ page }) => {
  await loginAsDemo(page);
  await page.goto("/t/acme-engineering/issues");
  await expect(page.getByRole("heading", { name: "Issues" })).toBeVisible();
});
