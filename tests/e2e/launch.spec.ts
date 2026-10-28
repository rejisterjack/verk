import { expect, test } from "@playwright/test";

import { loginAsDemo } from "./helpers/auth";

test("inbox page loads", async ({ page }) => {
  await loginAsDemo(page);
  await page.goto("/t/acme-engineering/inbox");
  await expect(page.getByRole("heading", { name: "Inbox" })).toBeVisible();
});

test("triage page loads", async ({ page }) => {
  await loginAsDemo(page);
  await page.goto("/t/acme-engineering/triage");
  await expect(page.getByRole("heading", { name: /triage/i })).toBeVisible();
});

test("projects page loads", async ({ page }) => {
  await loginAsDemo(page);
  await page.goto("/t/acme-engineering/projects");
  await expect(page.getByRole("heading", { name: /projects/i })).toBeVisible();
});

test("import settings page loads", async ({ page }) => {
  await loginAsDemo(page);
  await page.goto("/t/acme-engineering/settings/import");
  await expect(
    page.getByRole("heading", { name: /import from linear/i }),
  ).toBeVisible();
});

test("create issue dialog opens", async ({ page }) => {
  await loginAsDemo(page);
  await page.goto("/t/acme-engineering/issues");
  await page.getByRole("button", { name: /new issue/i }).click();
  await expect(
    page.getByRole("heading", { name: "Create issue" }),
  ).toBeVisible();
  await page.keyboard.press("Escape");
  await page.goto("/t/acme-engineering/issues/1");
  await expect(page.getByText(/Save changes/i)).toBeVisible();
});
