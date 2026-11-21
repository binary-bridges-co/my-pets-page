// Browser tests (docs/DESIGN.md, plan § Tests) on the built dist/ served by scripts/preview.mjs with
// the same _headers and _redirects as the host. CloudKit is answered from test/fixtures; every other
// request outside the preview is aborted, so nothing reaches Apple or anyone else.
import { defineConfig, devices } from '@playwright/test';

const PORT = 4173;
// PETS_LAUNCH=fixture serves the launch fixture build (the released state), for the home specs.
const build = process.env.PETS_LAUNCH === 'fixture' ? 'node scripts/build.mjs --launch=fixture' : 'npm run build --silent';

export default defineConfig({
  testDir: 'test/e2e',
  fullyParallel: true,
  forbidOnly: !!process.env.CI,
  retries: 0,
  workers: process.env.CI ? 2 : undefined,
  reporter: process.env.CI ? [['list'], ['github']] : 'list',
  use: {
    baseURL: `http://127.0.0.1:${PORT}`,
    trace: 'off',
    screenshot: 'off',
    video: 'off',
  },
  projects: [
    { name: 'chromium', use: { ...devices['Desktop Chrome'] } },
    { name: 'firefox', use: { ...devices['Desktop Firefox'] } },
    { name: 'webkit', use: { ...devices['Desktop Safari'] } },
  ],
  webServer: {
    command: `${build} && node scripts/preview.mjs --port=${PORT}`,
    url: `http://127.0.0.1:${PORT}/`,
    reuseExistingServer: false,
  },
});
