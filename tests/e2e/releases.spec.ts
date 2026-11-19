import { expect, test } from "@playwright/test";

import { loginAsDemo } from "./helpers/auth";

test("pipelines: create a pipeline and release, then move through stages", async ({
  page,
}) => {
  const suffix = Date.now().toString(36);
  const pipelineName = `Mobile ${suffix}`;
  const releaseName = `v-${suffix}`;

  await loginAsDemo(page);
  await page.goto("/t/acme-engineering/releases");
  await expect(page.getByRole("heading", { name: "Releases" })).toBeVisible();

  await page.getByLabel("New pipeline").fill(pipelineName);
  await page.getByRole("button", { name: "Add pipeline" }).click();
  await expect(page.getByText(pipelineName).first()).toBeVisible();

  await page.getByLabel("Name", { exact: true }).first().fill(releaseName);
  await page.getByLabel("Pipeline").selectOption({ label: pipelineName });
  await page.getByRole("button", { name: "Add release" }).click();
  await expect(page.getByText(releaseName).first()).toBeVisible();

  const row = page.locator("li", { hasText: releaseName }).first();

  await expect(row.getByText(new RegExp(`${pipelineName} · Planned`))).toBeVisible();
  await row.locator("select[name='stageId']").selectOption({ label: "Started" });
  await row.getByRole("button", { name: "Save" }).click();
  await expect(
    page
      .locator("li", { hasText: releaseName })
      .first()
      .getByText(new RegExp(`${pipelineName} · Started`)),
  ).toBeVisible();
});