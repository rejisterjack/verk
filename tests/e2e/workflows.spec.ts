import { expect, test } from "@playwright/test";

import { loginAsDemo } from "./helpers/auth";

test("create issue with estimate then post a comment", async ({ page }) => {
  await loginAsDemo(page);
  await page.goto("/t/acme-engineering/issues");

  const title = `E2E create ${Date.now()}`;
  await page.getByRole("button", { name: /new issue/i }).click();
  await expect(
    page.getByRole("heading", { name: "Create issue" }),
  ).toBeVisible();
  await page.getByPlaceholder("Ship MCP docs").fill(title);
  await page.locator('select[name="estimate"]').selectOption("M");
  await page.getByRole("button", { name: "Create", exact: true }).click();

  await page.waitForURL(/\/t\/acme-engineering\/issues\/(\d+|tmp\/)/, {
    timeout: 15_000,
  });
  await expect(page.getByText(/Save changes/i)).toBeVisible({
    timeout: 15_000,
  });
  await expect(page.locator('select[name="estimate"]')).toHaveValue("M", {
    timeout: 15_000,
  });

  const comment = `E2E comment ${Date.now()}`;
  await page.getByPlaceholder("Leave a comment…").fill(comment);
  await page.getByRole("button", { name: /^Comment$/ }).click();
  await expect(page.getByText(comment)).toBeVisible({ timeout: 10_000 });
});

test("add relation by issue number", async ({ page }) => {
  await loginAsDemo(page);
  await page.goto("/t/acme-engineering/issues/5");
  await expect(page.getByRole("heading", { name: "Relations" })).toBeVisible();

  await page.getByPlaceholder("Issue #").fill("1");
  await page.getByRole("button", { name: /^Add$/ }).click();

  const link = page.getByRole("link", { name: /Set up Neon database/i });

  await expect(link).toBeVisible({ timeout: 10_000 });

  const row = page.locator("li").filter({ has: link });

  await row.getByRole("button", { name: /^Remove$/ }).click();
  await expect(link).toHaveCount(0, { timeout: 10_000 });
});
