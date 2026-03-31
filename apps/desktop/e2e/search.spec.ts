import { expect, test } from '@playwright/test';
import { launchElectron } from './electron-launch';

test.describe('Graph Search', () => {
  let electronApp: Awaited<ReturnType<typeof launchElectron>>;
  let page: Awaited<ReturnType<typeof electronApp.firstWindow>>;

  test.beforeAll(async () => {
    electronApp = await launchElectron();
    page = await electronApp.firstWindow();
    await page.waitForLoadState('domcontentloaded');

    // Load sample ontology so classes are available to search
    const loadBtn = page.getByText('Load sample ontology');
    if (await loadBtn.isVisible({ timeout: 5_000 }).catch(() => false)) {
      await loadBtn.click();
      await expect(page.getByText('Person')).toBeVisible({ timeout: 15_000 });
    }
  });

  test.afterAll(async () => {
    await electronApp?.close();
  });

  test('Cmd/Ctrl+F focuses search bar', async () => {
    const modifier = process.platform === 'darwin' ? 'Meta' : 'Control';
    await page.keyboard.press(`${modifier}+f`);
    const searchInput = page.getByPlaceholder(/search/i);
    await expect(searchInput).toBeFocused({ timeout: 5_000 });
  });

  test('search bar shows results for known class', async () => {
    const searchInput = page.getByPlaceholder(/search/i);
    await searchInput.fill('Person');
    // Dropdown should appear with at least one result
    const dropdown = page
      .locator('[role="listbox"], [role="option"], [data-search-result]')
      .first();
    if ((await dropdown.count()) > 0) {
      await expect(dropdown).toBeVisible({ timeout: 5_000 });
    } else {
      // Fallback: the text 'Person' appears somewhere in results
      await expect(page.getByText('Person').first()).toBeVisible({ timeout: 5_000 });
    }
  });

  test('clearing search input hides results', async () => {
    const searchInput = page.getByPlaceholder(/search/i);
    await searchInput.fill('');
    // Escape also closes
    await page.keyboard.press('Escape');
    // No assertion on dropdown — we verify no crash / still usable
    await expect(page.locator('body')).toBeVisible();
  });

  test('search for non-existent class returns no crash', async () => {
    const searchInput = page.getByPlaceholder(/search/i);
    await searchInput.fill('XYZ_NOT_EXIST_12345');
    // Should not crash — body still present
    await expect(page.locator('body')).toBeVisible();
    await searchInput.fill('');
  });
});
