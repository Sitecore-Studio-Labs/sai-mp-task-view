import { BrowserContext, expect, Page, Route, test } from "@playwright/test";

import { installExtensionSetupCompleteMocks } from "../helpers/mockExtensionSetupComplete";

const baseURL = process.env.PLAYWRIGHT_BASE_URL ?? "http://localhost:3000";

const taskManagerGoto = (page: Page) =>
  page.goto("/task-manager-extension", { waitUntil: "domcontentloaded" });

test.describe("Connect to Jira", () => {
  const mockJiraStatus = async (page: Page, connected: boolean) => {
    await page.unroute("**/api/auth/jira/status");
    await page.route("**/api/auth/jira/status", async (route: Route) => {
      await route.fulfill({
        status: 200,
        contentType: "application/json",
        body: JSON.stringify({ connected }),
      });
    });
  };

  const setJiraCookie = async (context: BrowserContext, page: Page, value: string) => {
    const hostname = new URL(page.url()).hostname;
    await context.addCookies([
      {
        name: "jira_session_token",
        value,
        domain: hostname,
        path: "/",
      },
    ]);
  };

  /** Session cookie before first navigation (avoids hostname / double-goto races). */
  const setJiraCookieByUrl = async (context: BrowserContext, value: string) => {
    await context.addCookies([
      {
        name: "jira_session_token",
        value,
        url: baseURL,
      },
    ]);
  };

  test("Should be able to successfully log via successful authentication", async ({
    page,
    context,
  }) => {
    await installExtensionSetupCompleteMocks(page);
    await mockJiraStatus(page, false);
    await taskManagerGoto(page);

    // Step 1: Verify user already logged out.
    await expect(page.getByTestId("connect-to-jira")).toBeVisible();
    await expect(page.getByTestId("connect-jira-account")).toBeVisible({
      timeout: 15_000,
    });

    // Step 2: Connect to Jira.
    await mockJiraStatus(page, true);
    await page.getByTestId("connect-jira-account").click();

    await page.evaluate(() => {
      window.postMessage({ type: "OAUTH_CONNECTED", platform: "Jira" }, window.location.origin);
    });

    // Step 3: Add cookies
    await setJiraCookie(context, page, "12345");

    // Step 4: Verify cookies
    const cookies = await context.cookies();
    const jiraCookie = cookies.find((c) => c.name === "jira_session_token");
    expect(jiraCookie).toBeDefined();
    expect(jiraCookie?.value).toBe("12345");

    // Step 5: Successfully connected to Jira.
    await expect(page.getByText("Connected to Jira")).toBeVisible({ timeout: 15_000 });
  });

  test("If OAuth flow is interrupted, user remains logged out", async ({ page }) => {
    await installExtensionSetupCompleteMocks(page);
    await mockJiraStatus(page, false);
    await taskManagerGoto(page);

    // Step 1: Verify user already logged out.
    await expect(page.getByTestId("connect-to-jira")).toBeVisible();

    // Step 2: User click on the Connect button.
    await page.getByTestId("connect-jira-account").click();

    // Step 3: Verify still user logged out
    await expect(page.getByTestId("connect-to-jira")).toBeVisible();
    await expect(page.getByTestId("connect-jira-account")).toBeVisible({
      timeout: 15_000,
    });
    await expect(page.getByText("Connected to Jira")).not.toBeVisible();
  });

  test("If the user already loggedin, user able to directly go to the application", async ({
    page,
    context,
  }) => {
    await installExtensionSetupCompleteMocks(page);
    await setJiraCookieByUrl(context, "12345");
    await mockJiraStatus(page, true);
    await taskManagerGoto(page);

    await expect(page.getByText("Connected to Jira")).toBeVisible({ timeout: 15_000 });
  });

  test("If jira_session_token cookie is missing, user should be logged out", async ({
    page,
    context,
  }) => {
    await installExtensionSetupCompleteMocks(page);
    // Step 1: Ensure no cookies exist
    await context.clearCookies();

    // Step 2: Ensure backend returns not connected
    await mockJiraStatus(page, false);

    // Step 3: Reload page so state is applied
    await taskManagerGoto(page);

    // Step 4: User should see logged-out state (Connect button appears after client URL hydrates)
    await expect(page.getByTestId("connect-to-jira")).toBeVisible();
    await expect(page.getByTestId("connect-jira-account")).toBeVisible({
      timeout: 15_000,
    });

    // Step 5: Verify not connected
    await expect(page.getByText("Connected to Jira")).not.toBeVisible();
  });
});
