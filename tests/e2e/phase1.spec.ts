import { expect, test } from "@playwright/test";

import { loginAsDemo } from "./helpers/auth";

/**
 * Phase 1 walk-through from docs/superpowers/plans/2026-11-13-verk-remaining-linear-features.md:
 * triage, roadmap, insights, a document, an initiative, a reply, and the intake form.
 * Releases have their own spec (releases.spec.ts). Runs against the seeded `acme-engineering` team.
 */
const TEAM = "/t/acme-engineering";
const unique = () => Date.now().toString(36);

test("triage: status rules section is present for admins", async ({ page }) => {
  await loginAsDemo(page);
  await page.goto(`${TEAM}/triage`);
  await expect(page.getByRole("heading", { name: /triage/i })).toBeVisible();
  await expect(
    page.getByRole("heading", { name: "When status changes" }),
  ).toBeVisible();
  await expect(
    page.getByRole("button", { name: "Add status rule" }),
  ).toBeVisible();
});

test("roadmap: loads with initiatives and projects", async ({ page }) => {
  await loginAsDemo(page);
  await page.goto(`${TEAM}/roadmap`);
  await expect(page.getByRole("heading", { name: "Roadmap" })).toBeVisible();
});

test("initiatives: create one and see it listed and on the roadmap", async ({
  page,
}) => {
  const name = `Init ${unique()}`;

  await loginAsDemo(page);
  await page.goto(`${TEAM}/initiatives`);
  await page.getByLabel("Initiative", { exact: true }).fill(name);
  await page.getByRole("button", { name: "Create initiative" }).click();
  await expect(page.getByText(name).first()).toBeVisible();

  await page.goto(`${TEAM}/roadmap`);
  await expect(page.getByText(name).first()).toBeVisible();
});

test("documents: create a document and see it in the team list", async ({
  page,
}) => {
  const title = `Doc ${unique()}`;

  await loginAsDemo(page);
  await page.goto(`${TEAM}/docs`);
  await page.getByLabel("Title").first().fill(title);
  await page.getByLabel("Body").first().fill("Hello from the Phase 1 walk-through");
  await page.getByRole("button", { name: "Save document" }).click();
  await expect(page.getByText(title).first()).toBeVisible();
});

test("insights: save a filter as a card and it survives a reload", async ({
  page,
}) => {
  const name = `Card ${unique()}`;

  await loginAsDemo(page);
  await page.goto(`${TEAM}/insights`);
  await page.getByLabel("Save this filter").fill(name);
  await page.getByRole("button", { name: "Save card" }).click();
  await page.reload();
  await expect(page.getByText(name).first()).toBeVisible();
});

test("comments: a reply to a comment appears under it", async ({ page }) => {
  const body = `Root ${unique()}`;
  const reply = `Reply ${unique()}`;

  await loginAsDemo(page);
  await page.goto(`${TEAM}/issues/1`);
  await page.getByLabel("Comment", { exact: true }).fill(body);
  await page.getByRole("button", { name: "Comment", exact: true }).click();
  await expect(page.getByText(body).first()).toBeVisible();

  const item = page.locator("li", { hasText: body }).first();

  await item.getByRole("button", { name: "Reply", exact: true }).first().click();
  await item.getByPlaceholder("Reply…").fill(reply);
  await item.getByRole("button", { name: "Reply", exact: true }).last().click();
  await expect(page.getByText(reply).first()).toBeVisible();
});

test("intake: submitting creates an issue and opens it", async ({ page }) => {
  const detail = `Intake ${unique()}`;

  await loginAsDemo(page);
  await page.goto(`${TEAM}/intake`);
  await expect(page.getByRole("heading", { name: "Intake" })).toBeVisible();
  await page.getByLabel("Priority").selectOption("HIGH");
  await page.getByLabel("Detail").fill(detail);
  await page.getByRole("button", { name: "Create issue" }).click();
  await page.waitForURL(/\/t\/acme-engineering\/issues\/\d+/);
  await expect(page.getByText(detail).first()).toBeVisible();
});