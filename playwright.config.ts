import { defineConfig, devices } from '@playwright/test'

// E2E runs against a real dev server. Auth is bypassed by running with an
// empty APP_PASSWORD (app/api/auth auto-allows when APP_PASSWORD is unset),
// so tests navigate directly to protected pages without logging in.
export default defineConfig({
  testDir: './e2e',
  fullyParallel: false,
  workers: 1,
  forbidOnly: !!process.env.CI,
  retries: process.env.CI ? 2 : 0,
  reporter: 'html',
  use: {
    baseURL: process.env.BASE_URL || 'http://localhost:3000',
    trace: 'on-first-retry',
  },
  projects: [
    {
      name: 'chromium',
      use: { ...devices['Desktop Chrome'] },
    },
  ],
  // Auto-start the dev server for local runs; reuse an already-running server
  // in CI or when BASE_URL points elsewhere.
  webServer: {
    command: 'npm run dev',
    url: process.env.BASE_URL || 'http://localhost:3000',
    reuseExistingServer: !process.env.CI,
    timeout: 120 * 1000,
    env: {
      // Bypass password auth so E2E can hit protected routes directly.
      APP_PASSWORD: '',
    },
  },
})
