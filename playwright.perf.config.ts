import { defineConfig, devices } from "@playwright/test";

const port = 3111;
const baseURL = `http://127.0.0.1:${port}`;

// Performance runs are sequential and never retried; numbers are recorded as annotations and checked against budgets.
export default defineConfig({
  testDir: "tests/perf",
  fullyParallel: false,
  retries: 0,
  timeout: 120_000,
  reporter: "list",
  use: { baseURL, trace: "off" },
  webServer: {
    command: `npm run build && npx next start --port ${port}`,
    url: baseURL,
    reuseExistingServer: !process.env.CI,
    timeout: 240_000,
  },
  projects: [{ name: "chromium", use: { ...devices["Desktop Chrome"] } }],
});
