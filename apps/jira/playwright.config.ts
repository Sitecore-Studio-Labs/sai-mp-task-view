import path from "node:path";

import { defineConfig, devices } from "@playwright/test";

const workspaceRoot = path.join(__dirname, "../..");

export default defineConfig({
  testDir: path.join(workspaceRoot, "e2e/jira"),
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
        ? "npx nx run jira:serve --configuration=production -- -p 3000"
        : "npx nx run jira:build && npx nx run jira:serve --configuration=production -- -p 3000"
      : "npx nx run jira:serve -- -p 3000",
    url: process.env.PLAYWRIGHT_BASE_URL ?? "http://localhost:3000",
    cwd: workspaceRoot,
    reuseExistingServer: !process.env.CI,
    timeout: 120_000,
  },
  projects: [
    {
      name: "chromium",
      use: { ...devices["Desktop Chrome"] },
    },
  ],
});
