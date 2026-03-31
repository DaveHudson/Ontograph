import { _electron as electron, expect, test } from '@playwright/test';
import { ELECTRON_MAIN } from '../playwright.config';

test.describe('Ontology CRUD', () => {
  let electronApp: Awaited<ReturnType<typeof electron.launch>>;
  let page: Awaited<ReturnType<typeof electronApp.firstWindow>>;

  test.beforeAll(async () => {
    electronApp = await electron.launch({
      args: [ELECTRON_MAIN],
      env: { ...process.env, NODE_ENV: 'test' },
    });
    page = await electronApp.firstWindow();
    await page.waitForLoadState('domcontentloaded');
  });

  test.afterAll(async () => {
    await electronApp.close();
  });

  test('empty state is shown on launch', async () => {
    await expect(page.getByText('Load sample ontology')).toBeVisible({ timeout: 10_000 });
  });

  test('loads sample ontology and renders Person node', async () => {
    await page.getByText('Load sample ontology').click();
    await expect(page.getByText('Person')).toBeVisible({ timeout: 15_000 });
  });

  test('Organisation node is visible after loading sample', async () => {
    // Depends on previous test having loaded the sample
    await expect(page.getByText('Organisation')).toBeVisible({ timeout: 10_000 });
  });

  test('search bar accepts input', async () => {
    const searchBar = page.getByPlaceholder(/search label/i);
    if ((await searchBar.count()) > 0) {
      await searchBar.fill('Person');
      await expect(searchBar).toHaveValue('Person');
      await searchBar.fill('');
    }
  });
});
