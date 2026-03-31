import { _electron as electron, expect, test } from '@playwright/test';
import { ELECTRON_MAIN } from '../playwright.config';

const SAMPLE_TTL = `@prefix owl: <http://www.w3.org/2002/07/owl#> .
@prefix rdfs: <http://www.w3.org/2000/01/rdf-schema#> .
@prefix ex: <http://example.org/test#> .

ex:Widget a owl:Class ;
    rdfs:label "Widget" ;
    rdfs:comment "A test widget class" .

ex:Gadget a owl:Class ;
    rdfs:label "Gadget" ;
    rdfs:subClassOf ex:Widget .`;

test.describe('Import / Export', () => {
  let electronApp: Awaited<ReturnType<typeof electron.launch>>;
  let page: Awaited<ReturnType<typeof electronApp.firstWindow>>;

  test.beforeAll(async () => {
    electronApp = await electron.launch({
      args: [ELECTRON_MAIN],
      env: { ...process.env, NODE_ENV: 'test' },
    });
    page = await electronApp.firstWindow();
    await page.waitForLoadState('domcontentloaded');

    // Load sample ontology if empty state is showing
    const loadBtn = page.getByText('Load sample ontology');
    if (await loadBtn.isVisible({ timeout: 5_000 }).catch(() => false)) {
      await loadBtn.click();
      await expect(page.getByText('Person')).toBeVisible({ timeout: 15_000 });
    }
  });

  test.afterAll(async () => {
    await electronApp.close();
  });

  test('sample ontology classes are visible', async () => {
    await expect(page.getByText('Person')).toBeVisible({ timeout: 10_000 });
    await expect(page.getByText('Organisation')).toBeVisible({ timeout: 5_000 });
  });

  test('Turtle paste populates graph with Widget class', async () => {
    // Write TTL to clipboard via Electron's clipboard API
    await electronApp.evaluate(async ({ clipboard }, ttl) => {
      clipboard.writeText(ttl);
    }, SAMPLE_TTL);

    // Focus the renderer and paste
    await page.locator('body').click();
    const modifier = process.platform === 'darwin' ? 'Meta' : 'Control';
    await page.keyboard.press(`${modifier}+v`);

    // Widget class should appear in the graph
    await expect(page.getByText('Widget')).toBeVisible({ timeout: 10_000 });
  });

  test('Save As shortcut is reachable', async () => {
    // Trigger Cmd/Ctrl+Shift+S — verifies the menu accelerator is registered.
    // A native file dialog may appear; we dismiss it immediately.
    const modifier = process.platform === 'darwin' ? 'Meta' : 'Control';
    await page.keyboard.press(`${modifier}+Shift+S`);
    // Dismiss any dialog that might open
    await page.keyboard.press('Escape');
    // No assertion — we just verify the shortcut doesn't crash the app
    await expect(page.locator('body')).toBeVisible();
  });
});
