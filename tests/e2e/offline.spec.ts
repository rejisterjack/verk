import { expect, test } from "@playwright/test";

test.describe("offline issue workflow", () => {
  test("create issue offline then sync when back online", async ({
    page,
    context,
  }) => {
    await page.goto("/login");
    await page.getByLabel("Email").fill("demo@verk.dev");
    await page.getByLabel("Password").fill("demo1234");
    await page.getByRole("button", { name: /sign in/i }).click();
    await page.waitForURL(/\/(onboarding|t\/)/);

    await page.goto("/t/acme-engineering/board");
    await expect(page.getByRole("heading", { name: "Board" })).toBeVisible();

    // Warm caches while online
    await page.waitForTimeout(500);

    await context.setOffline(true);
    await page.getByRole("button", { name: "New issue" }).click();
    const title = `Offline issue ${Date.now()}`;

    await page.getByPlaceholder("Ship MCP docs").fill(title);
    await page.getByRole("button", { name: "Create" }).click();

    await expect(page.getByText(/TMP|Offline/i).first()).toBeVisible({
      timeout: 10_000,
    });

    await context.setOffline(false);
    await page.waitForTimeout(2000);
    await page.goto("/t/acme-engineering/issues");
    await expect(page.getByText(title)).toBeVisible({ timeout: 15_000 });
  });

  test("offline fallback page is reachable", async ({ page, context }) => {
    await page.goto("/~offline");
    await expect(page.getByRole("heading", { name: /offline/i })).toBeVisible();
    await context.setOffline(true);
    await page.goto("/~offline");
    await expect(page.getByText("Verk")).toBeVisible();
  });
});
