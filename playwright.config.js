import { defineConfig, devices } from '@playwright/test';
import path from 'node:path';

const baseURL = 'http://127.0.0.1:4173';

export default defineConfig({
  testDir: './tests/visual',
  testMatch: '**/*.visual.js',
  globalSetup: './tests/visual/global-setup.js',
  outputDir: './test-results/visual',
  fullyParallel: false,
  forbidOnly: !!process.env.CI,
  retries: process.env.CI ? 1 : 0,
  workers: process.env.CI ? 1 : undefined,
  timeout: 30_000,
  expect: {
    timeout: 7_500,
    toHaveScreenshot: {
      animations: 'disabled',
      caret: 'hide',
      maxDiffPixelRatio: 0.003,
      stylePath: path.resolve('tests/visual/screenshot.css'),
      threshold: 0.2,
    },
    toMatchSnapshot: {
      maxDiffPixelRatio: 0.003,
      threshold: 0.2,
    },
  },
  reporter: process.env.CI
    ? [['line'], ['html', { open: 'never' }]]
    : [['list'], ['html', { open: 'never' }]],
  snapshotPathTemplate: '{testDir}/__screenshots__/{arg}-{projectName}{ext}',
  use: {
    baseURL,
    locale: 'fr-FR',
    serviceWorkers: 'block',
    timezoneId: 'Europe/Paris',
    trace: 'retain-on-failure',
  },
  projects: [
    {
      name: 'chromium',
      use: {
        ...devices['Desktop Chrome'],
      },
    },
  ],
});
