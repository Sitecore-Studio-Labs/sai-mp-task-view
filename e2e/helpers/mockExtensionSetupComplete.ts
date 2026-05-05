import type { Page } from "@playwright/test";

/** Pathname for Playwright `page.route` URL predicate (may be a string or `URL`). */
function routeUrlPathname(url: string | URL): string {
  const href = typeof url === "string" ? url : url.toString();
  return new URL(href).pathname;
}

/**
 * E2E: user is Jira-connected and has finished the setup wizard (`setup_completed_at` set),
 * so the connection + setup gates render the main task manager shell.
 */
export const mockCompletedSetupResponse = {
  connected: true,
  setup: {
    id: "e2e-setup-1",
    user_id: "e2e-user",
    jira_connection_id: "e2e-conn-1",
    jira_site_id: "cloud-1",
    jira_site_url: "https://example.atlassian.net",
    jira_site_name: "Example",
    default_project_id: "10001",
    default_project_key: "DEMO",
    default_project_name: "Demo",
    setup_completed_at: "2020-01-01T00:00:00.000Z",
    created_at: "2020-01-01T00:00:00.000Z",
    updated_at: "2020-01-01T00:00:00.000Z",
  },
  mappings: [] as const,
} as const;

/**
 * Mocks `GET /api/setup` and `GET /api/setup/mappings` for a completed setup flow.
 * Register before navigating to `/task-manager-extension` when the test expects the main app.
 */
export async function installExtensionSetupCompleteMocks(page: Page) {
  await page.route(
    (url) => routeUrlPathname(url) === "/api/setup/mappings",
    async (route) => {
      if (route.request().method() !== "GET") {
        await route.continue();
        return;
      }
      await route.fulfill({
        status: 200,
        contentType: "application/json",
        body: JSON.stringify([]),
      });
    },
  );

  await page.route(
    (url) => routeUrlPathname(url) === "/api/setup",
    async (route) => {
      if (route.request().method() !== "GET") {
        await route.continue();
        return;
      }
      await route.fulfill({
        status: 200,
        contentType: "application/json",
        body: JSON.stringify(mockCompletedSetupResponse),
      });
    },
  );
}
