import path from 'node:path';
import { defineConfig } from '@playwright/test';

export default defineConfig({
  testDir: './e2e',
  testMatch: '**/*.spec.ts',
  timeout: 60_000,
  retries: 1,
  workers: 1, // Electron tests must run serially — single app instance
  reporter: [
    ['junit', { outputFile: 'test-results/junit.xml' }],
    ['html', { open: 'never', outputFolder: 'test-results/html' }],
    ['list'],
  ],
  use: {
    // Path to the built Electron main entry, relative to this config file
    // Resolved at test time via the `electronApp` fixture in each spec.
  },
  // Make the built app path available to tests via env
  globalSetup: undefined,
  outputDir: 'test-results/artifacts',
});

/** Absolute path to the Electron main entry after `electron-vite build`. */
export const ELECTRON_MAIN = path.resolve(__dirname, 'out/main/index.js');
