import { expect, test } from '@playwright/test';
import { launchElectron } from './electron-launch';

test.describe('File Menu Shortcuts', () => {
  let electronApp: Awaited<ReturnType<typeof launchElectron>>;
  let page: Awaited<ReturnType<typeof electronApp.firstWindow>>;

  test.beforeAll(async () => {
    electronApp = await launchElectron();
    page = await electronApp.firstWindow();
    await page.waitForLoadState('domcontentloaded');

    // Load sample ontology first
    const loadBtn = page.getByText('Load sample ontology');
    if (await loadBtn.isVisible({ timeout: 5_000 }).catch(() => false)) {
      await loadBtn.click();
      await expect(page.getByText('Person')).toBeVisible({ timeout: 15_000 });
    }
  });

  test.afterAll(async () => {
    await electronApp?.close();
  });

  test('Cmd/Ctrl+N triggers new ontology (clears graph or shows confirmation)', async () => {
    const modifier = process.platform === 'darwin' ? 'Meta' : 'Control';
    await page.keyboard.press(`${modifier}+n`);
    // After new: either empty state or confirmation dialog; neither should crash
    await page.waitForTimeout(500);
    await expect(page.locator('body')).toBeVisible();
    // Dismiss any dialog
    await page.keyboard.press('Escape');
  });

  test('Cmd/Ctrl+S does not crash the app', async () => {
    const modifier = process.platform === 'darwin' ? 'Meta' : 'Control';
    await page.keyboard.press(`${modifier}+s`);
    // Native Save dialog may appear — dismiss it
    await page.waitForTimeout(500);
    await page.keyboard.press('Escape');
    await expect(page.locator('body')).toBeVisible();
  });

  test('Cmd/Ctrl+Shift+S (Save As) does not crash the app', async () => {
    const modifier = process.platform === 'darwin' ? 'Meta' : 'Control';
    await page.keyboard.press(`${modifier}+Shift+S`);
    await page.waitForTimeout(500);
    await page.keyboard.press('Escape');
    await expect(page.locator('body')).toBeVisible();
  });

  test('Cmd/Ctrl+O (Open) does not crash the app', async () => {
    const modifier = process.platform === 'darwin' ? 'Meta' : 'Control';
    await page.keyboard.press(`${modifier}+o`);
    await page.waitForTimeout(500);
    await page.keyboard.press('Escape');
    await expect(page.locator('body')).toBeVisible();
  });
});
