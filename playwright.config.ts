import { defineConfig, devices } from '@playwright/test';

export default defineConfig({
  testDir: './tests/e2e',
  use: {
    baseURL: 'http://127.0.0.1:3000',
    trace: 'on-first-retry',
    // The app now defaults to English; the existing specs were written against Portuguese.
    // Pin pt-BR for every test; tests that need English set field-shift:locale to 'en' themselves.
    storageState: { cookies: [], origins: [{ origin: 'http://127.0.0.1:3000', localStorage: [{ name: 'field-shift:locale', value: 'pt-BR' }] }] },
  },
  projects: [{ name: 'chromium', use: { ...devices['Desktop Chrome'] } }],
  webServer: { command: 'npm run dev', url: 'http://127.0.0.1:3000', reuseExistingServer: true },
});
