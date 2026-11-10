import { defineConfig, devices } from '@playwright/test';

// Its own port, so a `next dev` on 3000 is never mistaken for the e2e server.
const PORT = Number(process.env.PORT ?? 3100);
const MOCK_API_PORT = 4010;
const baseURL = `http://localhost:${PORT}`;

export default defineConfig({
  testDir: './e2e',
  fullyParallel: true,
  forbidOnly: !!process.env.CI,
  retries: process.env.CI ? 2 : 0,
  workers: process.env.CI ? 1 : undefined,
  reporter: process.env.CI ? [['github'], ['html', { open: 'never' }]] : 'list',
  use: {
    baseURL,
    trace: 'on-first-retry',
  },
  projects: [
    {
      name: 'chromium',
      use: { ...devices['Desktop Chrome'] },
    },
  ],
  webServer: [
    {
      // Stand-in for the backend API (e2e/mock-api.mjs).
      command: 'node e2e/mock-api.mjs',
      url: `http://127.0.0.1:${MOCK_API_PORT}/health`,
      env: { MOCK_API_PORT: String(MOCK_API_PORT) },
      reuseExistingServer: !process.env.CI,
    },
    {
      // Runs against a production build, the same code that gets deployed. Build first with `npm run build`.
      command: `npm run start -- --port ${PORT}`,
      url: baseURL,
      env: { API_URL: `http://127.0.0.1:${MOCK_API_PORT}/api` },
      reuseExistingServer: !process.env.CI,
      timeout: 120_000,
    },
  ],
});
