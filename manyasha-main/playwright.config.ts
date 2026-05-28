import { defineConfig, devices } from '@playwright/test';
import fs from 'node:fs';

const CI = Boolean(process.env.CI);
const useMockServer = process.env.E2E_USE_MOCK === '1';
const baseURL = process.env.PLAYWRIGHT_BASE_URL || 'http://127.0.0.1:4173';
const apiURL = process.env.PLAYWRIGHT_API_URL || 'http://127.0.0.1:8000';
const venv311Python = `${process.cwd()}/.venv311/bin/python`;
const venvPython = `${process.cwd()}/.venv/bin/python`;
const pythonCmd = process.env.PLAYWRIGHT_PYTHON
  || (fs.existsSync(venv311Python) ? venv311Python : (fs.existsSync(venvPython) ? venvPython : 'python3'));
const pythonCmdShell = pythonCmd.includes(' ') ? `"${pythonCmd}"` : pythonCmd;
const databaseURL = process.env.PLAYWRIGHT_DATABASE_URL
  || process.env.DATABASE_URL
  || 'sqlite:///./playwright-smoke.db';
const frontendCommand = process.env.PLAYWRIGHT_FRONTEND_COMMAND
  || 'npm --prefix frontend run build && npm --prefix frontend run preview -- --host 127.0.0.1 --port 4173';

const realWebServers = [
  {
    command: `${pythonCmdShell} -m uvicorn app:app --host 127.0.0.1 --port 8000`,
    url: `${apiURL}/healthz`,
    reuseExistingServer: !CI,
    timeout: 120_000,
    env: {
      ...process.env,
      DATABASE_URL: databaseURL,
      APP_ENV: 'test',
      DEV_AUTH_ENABLED: 'true',
      DEV_AUTH_SECRET: 'playwright-dev-auth-secret',
      DEV_STORAGE_ENABLED: 'true',
      JWT_SECRET: 'playwright-jwt-secret',
      ENCRYPTION_KEY: 'playwright-encryption-key',
      PARTNER_HEADER_AUTH_ENABLED: 'false',
      MANAYA_USE_CREATE_ALL: '1',
      MANAYA_SKIP_ALEMBIC: '1',
      WIDGET_CAPTCHA_REQUIRED: 'false',
    },
  },
  {
    command: frontendCommand,
    url: `${baseURL}/partner/mascot`,
    reuseExistingServer: !CI,
    timeout: 120_000,
    env: {
      ...process.env,
      SKIP_VITE_OPEN: '1',
      VITE_DEV_API_PROXY: apiURL,
      VITE_E2E_LIGHT_DASHBOARD: '1',
    },
  },
];

export default defineConfig({
  testDir: './tests/e2e',
  outputDir: `${process.cwd()}/test-results`,
  timeout: 40_000,
  expect: {
    timeout: 8_000,
  },
  retries: CI ? 2 : 0,
  use: {
    baseURL,
    headless: true,
    trace: 'retain-on-failure',
  },
  webServer: useMockServer
    ? {
        command: 'node tests/e2e/mock_partner_dashboard_server.mjs',
        url: `${baseURL}/partner/mascot`,
        reuseExistingServer: !CI,
        timeout: 30_000,
      }
    : realWebServers,
  projects: [
    {
      name: 'chromium',
      use: { browserName: 'chromium' },
    },
    {
      name: 'webkit',
      use: { browserName: 'webkit' },
    },
    {
      name: 'webkit-mobile',
      use: { ...devices['iPhone 13'], browserName: 'webkit' },
    },
  ],
});
