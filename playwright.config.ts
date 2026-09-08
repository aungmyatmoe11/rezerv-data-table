import { defineConfig, devices } from "@playwright/test";

const port = 3110;
const baseURL = `http://127.0.0.1:${port}`;

// E2E always runs against a fresh production build so what is tested is what ships.
export default defineConfig({
  testDir: "tests/e2e",
  fullyParallel: true,
  forbidOnly: !!process.env.CI,
  retries: process.env.CI ? 1 : 0,
  timeout: 60_000,
  expect: { timeout: 10_000 },
  reporter: process.env.CI ? [["github"], ["list"]] : "list",
  use: { baseURL, trace: "on-first-retry" },
  webServer: {
    command: `npm run build && npx next start --port ${port}`,
    url: baseURL,
    reuseExistingServer: !process.env.CI,
    timeout: 240_000,
  },
  projects: [
    // responsive.spec.ts asserts narrow-viewport behaviour, so the desktop project skips it and
    // the brief's two narrow targets — tablet and mobile — each run it at their own width
    { name: "desktop", use: { ...devices["Desktop Chrome"] }, testIgnore: /responsive\.spec\.ts/ },
    // Galaxy Tab S4 (712 × 1138) rather than an iPad: it is a Chromium profile, so CI still
    // installs one engine (the cross-browser trade-off is stated in the README)
    { name: "tablet", use: { ...devices["Galaxy Tab S4"] }, testMatch: /responsive\.spec\.ts/ },
    { name: "mobile", use: { ...devices["Pixel 7"] }, testMatch: /responsive\.spec\.ts/ },
  ],
});
