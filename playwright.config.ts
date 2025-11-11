/**
 * Playwright E2E Testing Configuration
 * Comprehensive testing setup for ClientForge CRM
 */

import { defineConfig, devices } from '@playwright/test';

export default defineConfig({
  testDir: './tests/e2e',
  testMatch: '**/*.spec.ts',

  // Maximum time one test can run
  timeout: 60 * 1000,

  // Test expectations timeout
  expect: {
    timeout: 10 * 1000,
  },

  // Run tests in files in parallel
  fullyParallel: true,

  // Fail the build on CI if you accidentally left test.only in the source code
  forbidOnly: !!process.env.CI,

  // Retry on CI only
  retries: process.env.CI ? 2 : 0,

  // Opt out of parallel tests on CI
  workers: process.env.CI ? 1 : undefined,

  // Reporter to use
  reporter: [
    ['html', { outputFolder: 'playwright-report', open: 'never' }],
    ['json', { outputFile: 'playwright-report/results.json' }],
    ['junit', { outputFile: 'playwright-report/junit.xml' }],
    ['list'],
    ...(process.env.CI ? [['github']] : []),
  ],

  // Shared settings for all projects
  use: {
    // Base URL for all tests
    baseURL: process.env.BASE_URL || 'http://localhost:3000',

    // Collect trace on first retry
    trace: 'on-first-retry',

    // Screenshot on failure
    screenshot: 'only-on-failure',

    // Video on failure
    video: 'retain-on-failure',

    // Emulate timezone
    timezoneId: 'America/New_York',

    // Emulate locale
    locale: 'en-US',

    // Extra HTTP headers
    extraHTTPHeaders: {
      'Accept-Language': 'en-US',
    },
  },

  // Configure projects for major browsers
  projects: [
    // Desktop browsers
    {
      name: 'chromium',
      use: { ...devices['Desktop Chrome'] },
    },
    {
      name: 'firefox',
      use: { ...devices['Desktop Firefox'] },
    },
    {
      name: 'webkit',
      use: { ...devices['Desktop Safari'] },
    },

    // Mobile browsers
    {
      name: 'mobile-chrome',
      use: { ...devices['Pixel 5'] },
    },
    {
      name: 'mobile-safari',
      use: { ...devices['iPhone 13'] },
    },

    // Tablet
    {
      name: 'tablet',
      use: { ...devices['iPad Pro'] },
    },
  ],

  // Run your local dev server before starting the tests
  webServer: process.env.CI ? undefined : {
    command: 'npm run start:test',
    url: 'http://localhost:3000/api/v1/health',
    reuseExistingServer: !process.env.CI,
    timeout: 120 * 1000,
  },

  // Global setup
  globalSetup: require.resolve('./tests/e2e/global-setup'),

  // Global teardown
  globalTeardown: require.resolve('./tests/e2e/global-teardown'),
});
