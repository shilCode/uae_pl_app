import { defineConfig, devices } from '@playwright/test';
import dotenv from 'dotenv';
import path from 'path';

dotenv.config({ path: path.resolve(__dirname, '.env') });

const isHeaded = process.env.HEADED !== 'false';

export default defineConfig({
  testDir: './tests',
  fullyParallel: false,
  forbidOnly: false,
  retries: 0,
  workers: 1,
  reporter: [['list'], ['html', { open: 'never' }]],
  timeout: 0, // No timeout for appointment checking

  use: {
    headless: !isHeaded,
    viewport: { width: 1280, height: 720 },
    actionTimeout: 15000,
    navigationTimeout: 30000,
    trace: 'retain-on-failure',
    screenshot: 'only-on-failure',
    video: 'retain-on-failure',
    // Slow down actions so the site doesn't flag automation
    launchOptions: {
      slowMo: 100,
    },
  },

  projects: [
    {
      name: 'appointment-checker',
      testMatch: 'appointment-checker.spec.ts',
      use: {
        ...devices['Desktop Chrome'],
        // Use real Chrome for less detection
        channel: 'chrome',
      },
    },
  ],
});
