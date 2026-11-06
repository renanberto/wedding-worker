import { defineConfig } from '@playwright/test';
const remote = process.env.E2E_BASE_URL;
const preview = process.env.E2E_PREVIEW === '1';
const localUrl = `http://127.0.0.1:${preview ? 4175 : 4173}`;
export default defineConfig({
  testDir: './tests/e2e',
  workers: 2,
  use: { baseURL: remote || localUrl, browserName: 'chromium' },
  webServer: remote ? undefined : { command: preview ? 'npm run preview -- --port 4175' : 'npm run dev -- --port 4173', url: localUrl, reuseExistingServer: !process.env.CI },
});
