import { defineConfig } from '@playwright/test';
const remote = process.env.E2E_BASE_URL;
const preview = process.env.E2E_PREVIEW === '1';
const site = process.env.E2E_SITE || 'test';
if (!/^[a-z0-9-]+$/.test(site)) throw new Error('E2E_SITE inválido.');
const port = process.env.E2E_PORT || (preview ? '4175' : '4173');
if (!/^\d{4,5}$/.test(port)) throw new Error('E2E_PORT inválida.');
const localUrl = `http://127.0.0.1:${port}`;
export default defineConfig({
  testDir: './tests/e2e',
  outputDir: `test-results/${site}${preview ? '-build' : ''}`,
  workers: 2,
  use: { baseURL: remote || localUrl, browserName: 'chromium' },
  webServer: remote ? undefined : { command: preview ? `npm run preview --workspace @wedding/${site} -- --port ${port}` : `npm run dev --workspace @wedding/${site} -- --port ${port}`, url: localUrl, reuseExistingServer: !process.env.CI },
});
