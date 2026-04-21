import { defineConfig, devices } from "@playwright/test";

export default defineConfig({
  testDir: "./e2e",
  testMatch: /.*\.e2e.ts/,
  fullyParallel: true,
  forbidOnly: !!process.env.CI,
  retries: process.env.CI ? 2 : 1,
  workers: process.env.CI ? 1 : 3,
  reporter: process.env.CI ? "github" : "list",
  use: {
    baseURL: process.env.PLAYWRIGHT_BASE_URL ?? "http://localhost:3000",
    trace: "on-first-retry",
    navigationTimeout: 45_000,
  },
  webServer: {
    command: process.env.CI
      ? process.env.PLAYWRIGHT_PREBUILT === "true"
        ? "npx nx run jira-app:next:start -- -p 3000"
        : "npx nx run jira-app:next:build && npx nx run jira-app:next:start -- -p 3000"
      : "npx nx run jira-app:next:dev -- -p 3000",
    url: process.env.PLAYWRIGHT_BASE_URL ?? "http://localhost:3000",
    reuseExistingServer: !process.env.CI,
    timeout: 120000,
  },
  projects: [
    {
      name: "chromium",
      use: { ...devices["Desktop Chrome"] },
    },
  ],
});
