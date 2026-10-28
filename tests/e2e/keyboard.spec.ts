import { expect, test } from "@playwright/test";

import { loginAsDemo } from "./helpers/auth";

test("command palette opens with meta+k", async ({ page }) => {
  await loginAsDemo(page);
  await page.goto("/t/acme-engineering/issues");
  await expect(page.getByRole("heading", { name: /issues/i })).toBeVisible();

  await page.keyboard.press("Meta+k");
  await expect(page.getByPlaceholder(/command or search/i)).toBeVisible({
    timeout: 5000,
  });
});
