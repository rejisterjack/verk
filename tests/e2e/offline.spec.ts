import { expect, test } from "@playwright/test";

import { loginAsDemo } from "./helpers/auth";

test.describe("offline issue workflow", () => {
  test("create issue offline then sync when back online", async ({
    page,
    context,
  }) => {
    await loginAsDemo(page);

    await page.goto("/t/acme-engineering/issues");
    await expect(page.getByRole("heading", { name: "Issues" })).toBeVisible();
    await page.waitForTimeout(500);

    await context.setOffline(true);
    await page.getByRole("button", { name: /new issue/i }).click();
    const title = `Offline issue ${Date.now()}`;

    await page.getByPlaceholder("Ship MCP docs").fill(title);
    await page
      .locator('select[name="estimate"]')
      .evaluate((el) => {
        const select = el as HTMLSelectElement;

        select.value = "M";
        select.dispatchEvent(new Event("input", { bubbles: true }));
        select.dispatchEvent(new Event("change", { bubbles: true }));
      });
    await expect(page.locator('select[name="estimate"]')).toHaveValue("M");
    await page.getByRole("button", { name: "Create", exact: true }).click();

    await expect(
      page.getByRole("heading", { name: "Create issue" }),
    ).toHaveCount(0, { timeout: 10_000 });

    await context.setOffline(false);
    await page.waitForTimeout(3000);
    await page.goto("/t/acme-engineering/issues");
    await expect(page.getByRole("link", { name: title })).toBeVisible({
      timeout: 20_000,
    });
  });

  test("offline fallback page is reachable", async ({ page, context }) => {
    await page.goto("/~offline");
    await expect(page.getByRole("heading", { name: /offline/i })).toBeVisible();
    await context.route("**/*", (route) => {
      const url = route.request().url();

      if (url.includes("/~offline") || url.includes("_next")) {
        return route.continue();
      }

      return route.abort();
    });
    await page.goto("/~offline");
    await expect(page.getByText("Verk")).toBeVisible();
  });
});
