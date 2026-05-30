// Playwright config for BookBridge frontend E2E tests.
//
// These specs run against the LIVE site (https://bookbridge.ge) by default.
// Override with BASE_URL to point at a local dev server, e.g.:
//   BASE_URL=http://localhost:5173 npx playwright test
//
// Runner + browsers come from the human's prebuilt install at C:\Users\User\bb-pw
// (the `playwright` package re-exports the test runner under `playwright/test`,
// and chromium is cached in the default ms-playwright location).
//
// Run from this folder:
//   node C:/Users/User/bb-pw/node_modules/playwright/cli.js test
// or, if a global `playwright`/`npx playwright` is on PATH:
//   npx playwright test
//
// Headed (watch it run):  ... test --headed
// Single file:            ... test home.spec.js

import { defineConfig, devices } from 'playwright/test';

const BASE_URL = process.env.BASE_URL || 'https://bookbridge.ge';

export default defineConfig({
  testDir: '.',
  // Live-site network latency varies; give each test room but keep it bounded.
  timeout: 45_000,
  expect: { timeout: 15_000 },
  // No retries locally by default; the human can pass --retries on CI.
  retries: process.env.CI ? 2 : 0,
  // One worker keeps live-site load gentle and output readable. Bump if desired.
  workers: process.env.CI ? 2 : 1,
  fullyParallel: false,
  reporter: [['list']],
  use: {
    baseURL: BASE_URL,
    // Wait for SPA hydration: 'load' is enough since content is client-rendered
    // and we use web-first assertions that auto-retry until visible.
    actionTimeout: 15_000,
    navigationTimeout: 30_000,
    trace: 'retain-on-failure',
    screenshot: 'only-on-failure',
    locale: 'en-US',
  },
  projects: [
    {
      name: 'chromium',
      use: { ...devices['Desktop Chrome'] },
    },
  ],
});
