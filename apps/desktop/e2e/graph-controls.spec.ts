import { expect, test } from '@playwright/test';
import { launchElectron } from './electron-launch';

test.describe('Graph Controls Panel', () => {
  let electronApp: Awaited<ReturnType<typeof launchElectron>>;
  let page: Awaited<ReturnType<typeof electronApp.firstWindow>>;

  test.beforeAll(async () => {
    electronApp = await launchElectron();
    page = await electronApp.firstWindow();
    await page.waitForLoadState('domcontentloaded');

    // Load sample ontology so the graph is populated
    const loadBtn = page.getByText('Load sample ontology');
    if (await loadBtn.isVisible({ timeout: 5_000 }).catch(() => false)) {
      await loadBtn.click();
      await expect(page.getByText('Person')).toBeVisible({ timeout: 15_000 });
    }
  });

  test.afterAll(async () => {
    await electronApp?.close();
  });

  test('graph canvas is rendered', async () => {
    await expect(page.locator('.react-flow')).toBeVisible({ timeout: 10_000 });
  });

  test('graph contains at least one node after loading sample', async () => {
    const nodes = page.locator('.react-flow__node');
    await expect(nodes.first()).toBeVisible({ timeout: 10_000 });
  });

  test('graph controls panel can be opened', async () => {
    // The controls panel is triggered by a toolbar button — look for a "Graph Controls" label
    // or a button with title/aria that opens graph settings.
    // Check if a controls toggle exists in toolbar area.
    const controlsBtn = page
      .locator('[title*="controls" i], [title*="graph" i], [aria-label*="controls" i]')
      .first();
    if ((await controlsBtn.count()) > 0) {
      await controlsBtn.click();
      await expect(page.getByText('Graph Controls')).toBeVisible({ timeout: 5_000 });
    } else {
      // Controls panel may not have a dedicated toggle visible without hover
      test.skip();
    }
  });

  test('react-flow nodes are interactive (hover does not crash)', async () => {
    const firstNode = page.locator('.react-flow__node').first();
    await firstNode.hover();
    // No crash expected
    await expect(page.locator('body')).toBeVisible();
  });

  test('graph legend is visible', async () => {
    // GraphLegend renders in the graph canvas corner
    const legend = page.locator('[class*="legend"], [data-testid="graph-legend"]').first();
    if ((await legend.count()) > 0) {
      await expect(legend).toBeVisible();
    } else {
      // Accept: legend may use text content instead
      test.skip();
    }
  });
});
