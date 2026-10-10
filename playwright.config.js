import { defineConfig, devices } from '@playwright/test';

// Uses the locally installed Google Chrome (no browser download needed).
export default defineConfig({
  testDir: 'tests/e2e',
  timeout: 60_000,
  fullyParallel: true,
  workers: 3,
  reporter: [['list']],
  use: {
    baseURL: 'http://127.0.0.1:4173/',
    channel: 'chrome',
    trace: 'retain-on-failure',
  },
  webServer: {
    command: 'node tools/serve.mjs',
    url: 'http://127.0.0.1:4173/',
    reuseExistingServer: true,
    timeout: 15_000,
  },
  projects: [
    { name: 'desktop', use: { viewport: { width: 1280, height: 800 } } },
    {
      name: 'phone',
      use: { ...devices['Pixel 7'], channel: 'chrome', defaultBrowserType: 'chromium' },
    },
  ],
});
