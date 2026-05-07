import { defineConfig, devices } from '@playwright/test'

const PORT = 4173
// Must match `base` in vite.config.js — vite preview serves under this prefix.
const BASE_PATH = '/StormScope/'

export default defineConfig({
  testDir: './tests/e2e',
  // Tests share IndexedDB / SW state — keep them serial so reload tests don't
  // race each other. They are still fast (< 30 s total).
  fullyParallel: false,
  workers: 1,
  retries: process.env.CI ? 1 : 0,
  reporter: process.env.CI ? [['github'], ['list']] : 'list',
  timeout: 30_000,
  expect: { timeout: 8_000 },

  use: {
    baseURL: `http://localhost:${PORT}${BASE_PATH}`,
    headless: true,
    viewport: { width: 390, height: 844 }, // iPhone 14 Pro size
    locale: 'en-US',
    timezoneId: 'Europe/Prague',
    actionTimeout: 8_000,
    navigationTimeout: 15_000,
    trace: 'retain-on-failure',
    screenshot: 'only-on-failure',
  },

  projects: [
    {
      name: 'chromium-mobile',
      use: { ...devices['Pixel 7'] },
    },
  ],

  webServer: {
    // Build first so the preview serves the latest dist/ at the BASE_PATH prefix.
    command: 'npm run build && npm run preview',
    url: `http://localhost:${PORT}${BASE_PATH}`,
    reuseExistingServer: !process.env.CI,
    timeout: 180_000,
    stdout: 'ignore',
    stderr: 'pipe',
  },
})
