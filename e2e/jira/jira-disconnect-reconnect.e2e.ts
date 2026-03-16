import { expect, test } from "@playwright/test";

test.describe("Jira connection: disconnect + reconnect", () => {
  test("disconnects Jira (with cancel) and can reconnect", async ({ page }) => {
    // Prevent real popup navigation during e2e.
    await page.addInitScript(() => {
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      (window as any).open = () => ({ closed: false });
    });

    let connected = true;

    const jiraSitesConnected = {
      resources: [{ id: "cloud-1", name: "Demo Jira", url: "https://example.atlassian.net" }],
      selectedSite: "cloud-1",
    };

    const jiraSitesDisconnected = { resources: [], selectedSite: "" };

    await page.route("**/api/auth/jira/status", async (route) => {
      await route.fulfill({
        status: 200,
        contentType: "application/json",
        body: JSON.stringify({ connected }),
      });
    });

    await page.route("**/api/jira/sites", async (route) => {
      await route.fulfill({
        status: 200,
        contentType: "application/json",
        body: JSON.stringify(connected ? jiraSitesConnected : jiraSitesDisconnected),
      });
    });

    await page.route("**/api/jira/projects", async (route) => {
      await route.fulfill({
        status: 200,
        contentType: "application/json",
        body: JSON.stringify(connected ? [{ id: "10000", key: "DEMO", name: "Demo Project" }] : []),
      });
    });

    await page.route("**/api/jira/issues**", async (route) => {
      await route.fulfill({
        status: 200,
        contentType: "application/json",
        body: JSON.stringify({ issues: [], isLast: true, nextPageToken: undefined }),
      });
    });

    await page.route("**/api/auth/jira/disconnect", async (route) => {
      connected = false;
      await route.fulfill({
        status: 200,
        contentType: "application/json",
        body: JSON.stringify({ success: true }),
      });
    });

    await page.goto("/task-manager-extension");

    // Step 1: Ensure Jira is connected.
    await expect(page.getByText("Connected to Jira")).toBeVisible();

    // Step 2: Open connection options.
    await page.getByRole("button", { name: "Connection options" }).click();

    // Step 3: Click Disconnect -> dialog appears.
    await page.getByRole("menuitem", { name: "Disconnect" }).click();
    await expect(page.getByRole("heading", { name: "Disconnect Jira" })).toBeVisible();

    // Edge case: cancel confirmation -> still connected.
    await page.getByRole("button", { name: "Cancel" }).click();
    await expect(page.getByText("Connected to Jira")).toBeVisible();

    // Disconnect for real.
    await page.getByRole("button", { name: "Connection options" }).click();
    await page.getByRole("menuitem", { name: "Disconnect" }).click();
    await page.getByRole("button", { name: "Disconnect" }).click();

    // Step 5: Observe connection status.
    await expect(page.getByText("Not connected")).toBeVisible();

    // Step 6: App prompts to connect (no crash).
    await expect(page.getByText("Connect to Jira")).toBeVisible();
    await expect(page.getByRole("button", { name: "Connect" })).toBeVisible();

    // Step 7: Reconnect (simulate Story 1 OAuth completion via postMessage).
    connected = true;
    await page.getByRole("button", { name: "Connect" }).click();
    await page.evaluate(() => {
      window.postMessage({ type: "OAUTH_CONNECTED", platform: "Jira" }, window.location.origin);
    });

    await expect(page.getByText("Connected to Jira")).toBeVisible();
  });
});
