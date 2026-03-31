import { expect, test } from '@playwright/test';
import { launchElectron } from './electron-launch';

test.describe('App Launch', () => {
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

  test('window title contains Ontograph', async () => {
    const title = await electronApp.evaluate(({ app }) => app.getName());
    expect(title).toBe('Ontograph');
  });

  test('toolbar is visible', async () => {
    await expect(page.locator('[title="Toggle theme"]')).toBeVisible({ timeout: 10_000 });
  });

  test('main content area renders', async () => {
    // Either empty-state buttons or graph canvas elements should be present
    const hasOpen = await page.getByRole('button', { name: /open/i }).count();
    const hasPaste = await page.getByRole('button', { name: /paste/i }).count();
    const hasGraph = await page.locator('.react-flow, [data-testid="graph-canvas"]').count();
    expect(hasOpen + hasPaste + hasGraph).toBeGreaterThan(0);
  });
});
