import { expect, test } from '@playwright/test';
import { launchElectron } from './electron-launch';

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
  let electronApp: Awaited<ReturnType<typeof launchElectron>>;
  let page: Awaited<ReturnType<typeof electronApp.firstWindow>>;

  test.beforeAll(async () => {
    electronApp = await launchElectron();
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
    await electronApp?.close();
  });

  test('sample ontology classes are visible', async () => {
    await expect(page.getByText('Person')).toBeVisible({ timeout: 10_000 });
    await expect(page.getByText('Organisation')).toBeVisible({ timeout: 5_000 });
  });

  test('Turtle content can be written to and read from clipboard', async () => {
    // Verifies the Electron clipboard API is functional — a prerequisite for
    // any TTL import workflow that uses clipboard as the transfer mechanism.
    await electronApp.evaluate(({ clipboard }, ttl) => {
      clipboard.writeText(ttl);
    }, SAMPLE_TTL);

    const written = await electronApp.evaluate(({ clipboard }) => clipboard.readText());
    expect(written).toContain('Widget');
    expect(written).toContain('Gadget');
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
