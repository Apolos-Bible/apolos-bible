import { defineConfig, devices } from '@playwright/test'
import path from 'node:path'

const backendDirectory = process.env.APOLOS_BACKEND_DIR
  ?? path.resolve(process.cwd(), '../apolos-backend-testing')

export default defineConfig({
  testDir: './e2e-fullstack',
  fullyParallel: false,
  forbidOnly: Boolean(process.env.CI),
  retries: 0,
  workers: 1,
  reporter: process.env.CI
    ? [['line'], ['html', { outputFolder: 'playwright-report-fullstack', open: 'never' }]]
    : [['list'], ['html', { outputFolder: 'playwright-report-fullstack', open: 'never' }]],
  use: {
    baseURL: 'http://localhost:1420',
    screenshot: 'only-on-failure',
    trace: 'retain-on-failure',
    video: 'retain-on-failure',
  },
  projects: [
    { name: 'fullstack-desktop', use: { ...devices['Desktop Chrome'] } },
    { name: 'fullstack-mobile', use: { ...devices['Pixel 7'] } },
  ],
  webServer: [{
    command: 'node scripts/start-fullstack-backend.mjs',
    url: 'http://127.0.0.1:8000/api/versions',
    reuseExistingServer: !process.env.CI,
    timeout: 120_000,
    env: {
      ...process.env,
      APP_ENV: 'testing',
      APP_URL: 'http://127.0.0.1:8000',
      FRONTEND_URL: 'http://localhost:1420',
      APOLOS_BACKEND_DIR: backendDirectory,
    },
  }, {
    command: 'pnpm dev --host 127.0.0.1',
    url: 'http://127.0.0.1:1420',
    reuseExistingServer: !process.env.CI,
    timeout: 120_000,
    env: {
      ...process.env,
      VITE_API_URL: 'http://127.0.0.1:8000',
    },
  }],
})
