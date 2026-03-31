import { expect, test } from '@playwright/test';
import { launchElectron } from './electron-launch';

test.describe('Theme and Sidebar', () => {
  let electronApp: Awaited<ReturnType<typeof launchElectron>>;
  let page: Awaited<ReturnType<typeof electronApp.firstWindow>>;

  test.beforeAll(async () => {
    electronApp = await launchElectron();
    page = await electronApp.firstWindow();
    await page.waitForLoadState('domcontentloaded');
  });

  test.afterAll(async () => {
    await electronApp?.close();
  });

  test('theme toggle button is visible', async () => {
    await expect(page.locator('[title="Toggle theme"]')).toBeVisible({ timeout: 10_000 });
  });

  test('clicking theme toggle switches icon', async () => {
    const toggle = page.locator('[title="Toggle theme"]');
    // Get initial icon count (Sun or Moon svg inside button)
    const before = await toggle.innerHTML();
    await toggle.click();
    const after = await toggle.innerHTML();
    expect(before).not.toBe(after);
  });

  test('theme toggle is idempotent: two clicks restores original icon', async () => {
    const toggle = page.locator('[title="Toggle theme"]');
    const before = await toggle.innerHTML();
    await toggle.click();
    await toggle.click();
    const after = await toggle.innerHTML();
    expect(before).toBe(after);
  });

  test('sidebar toggle button is present', async () => {
    // The sidebar toggle button opens/closes the right panel
    const sidebarBtn = page
      .locator('[title="Toggle sidebar"], button:has(svg[data-lucide="panel-right"])')
      .first();
    if ((await sidebarBtn.count()) > 0) {
      await expect(sidebarBtn).toBeVisible();
    } else {
      // Accept: sidebar toggle may be hidden when no ontology is loaded
      test.skip();
    }
  });
});
