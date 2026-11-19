import { expect, test } from "@playwright/test";

import { loginAsDemo } from "./helpers/auth";

test("a non-form login body redirects instead of failing", async ({
  request,
}) => {
  const response = await request.post("/api/auth/password", {
    data: "not a form",
    headers: { "content-type": "application/json" },
    maxRedirects: 0,
  });

  expect(response.status()).toBe(303);
  expect(response.headers().location ?? "").toContain("error=CredentialsSignin");
  expect(response.headers().location ?? "").not.toContain("not+a+form");
});

test("demo user can sign in and sign out", async ({ page }) => {
  await loginAsDemo(page);
  await page.goto("/account");
  await page.getByRole("button", { name: /sign out/i }).click();
  await expect(page).toHaveURL(/\/$/);
  await page.goto("/t/acme-engineering/issues");
  await expect(page).toHaveURL(/\/login/);
});
