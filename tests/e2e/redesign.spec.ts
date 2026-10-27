import { test } from "@playwright/test";

const artifactDir = "/Users/rupam/.gemini/antigravity-ide/brain/d6302e49-ae38-48e0-b269-73cc90941eb5";

test("capture redesign snapshots and verify interactions", async ({ page }) => {
  await page.setViewportSize({ width: 1440, height: 900 });
  await page.goto("/", { waitUntil: "networkidle" });

  // 1. Hero section dark mode
  await page.screenshot({ path: `${artifactDir}/redesign_hero_dark.png` });

  // 2. Test Add Agent Issue in hero
  const addBtn = page.getByRole("button", { name: /Add Agent Issue/i });
  await addBtn.click();
  await page.waitForTimeout(500);
  await page.screenshot({ path: `${artifactDir}/redesign_hero_agent_added.png` });

  // 3. Test MCP simulator
  const simBtn = page.getByRole("button", { name: /Run Agent Simulation/i });
  await simBtn.scrollIntoViewIfNeeded();
  await simBtn.click();
  await page.waitForTimeout(2500);
  await page.screenshot({ path: `${artifactDir}/redesign_mcp_simulated.png` });

  // 4. Test Comparison Matrix
  const matrixHeading = page.locator("#comparison-heading");
  await matrixHeading.scrollIntoViewIfNeeded();
  await page.screenshot({ path: `${artifactDir}/redesign_comparison_matrix.png` });

  // 5. Test Feature Tabs
  const listTab = page.getByRole("button", { name: /High-Density List/i });
  await listTab.scrollIntoViewIfNeeded();
  await listTab.click();
  await page.waitForTimeout(400);
  await page.screenshot({ path: `${artifactDir}/redesign_feature_list_tab.png` });

  const cyclesTab = page.getByRole("button", { name: /Sprint Cycles/i });
  await cyclesTab.click();
  await page.waitForTimeout(400);
  await page.screenshot({ path: `${artifactDir}/redesign_feature_cycles_tab.png` });

  // 6. Full page dark
  await page.screenshot({ path: `${artifactDir}/redesign_full_dark.png`, fullPage: true });

  // 7. Light mode
  const themeSwitch = page.locator("nav button[aria-label*='Switch to']").first();
  if (await themeSwitch.isVisible()) {
    await themeSwitch.click();
    await page.waitForTimeout(600);
    await page.screenshot({ path: `${artifactDir}/redesign_hero_light.png` });
    await page.screenshot({ path: `${artifactDir}/redesign_full_light.png`, fullPage: true });
  }
});
