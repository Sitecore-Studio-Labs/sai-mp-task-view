import { BrowserContext, expect, Page, Route, test } from "@playwright/test";

test.describe("Connect to Jira", () => {
  const mockJiraStatus = async (page: Page, connected: boolean) => {
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

  test("Should be able to successfully log via successful authentication", async ({
    page,
    context,
  }) => {
    await mockJiraStatus(page, false);
    await page.goto("/task-manager-extension");

    // Step 1: Verify user already logged out.
    await expect(page.getByText("Connect to Jira")).toBeVisible();
    await expect(page.getByRole("button", { name: "Connect" })).toBeVisible();

    // Step 2: Connect to Jira.
    await mockJiraStatus(page, true);
    await page.getByRole("button", { name: "Connect" }).click();

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
    await expect(page.getByText("Connected to Jira")).toBeVisible();
  });

  test("If OAuth flow is interrupted, user remains logged out", async ({ page }) => {
    await mockJiraStatus(page, false);
    await page.goto("/task-manager-extension");

    // Step 1: Verify user already logged out.
    await expect(page.getByText("Connect to Jira")).toBeVisible();

    // Step 2: User click on the Connect button.
    await page.getByRole("button", { name: "Connect" }).click();

    // Step 3: Verify still user logged out
    await expect(page.getByText("Connect to Jira")).toBeVisible();
    await expect(page.getByRole("button", { name: "Connect" })).toBeVisible();
    await expect(page.getByText("Connected to Jira")).not.toBeVisible();
  });

  test("If the user already loggedin, user able to directly go to the application", async ({
    page,
    context,
  }) => {
    await mockJiraStatus(page, false);
    await page.goto("/task-manager-extension");

    // Step 1: Verify user already logged in via cookies. Set cookie before loading the page
    await setJiraCookie(context, page, "12345");

    // Setp 2: User is already connected
    await mockJiraStatus(page, true);

    // Step 3: Reload page so cookie + route take effect
    await page.goto("/task-manager-extension");

    // Step 4: Successfully connected to Jira.
    await expect(page.getByText("Connected to Jira")).toBeVisible();
  });

  test("If jira_session_token cookie is missing, user should be logged out", async ({
    page,
    context,
  }) => {
    // Step 1: Ensure no cookies exist
    await context.clearCookies();

    // Step 2: Ensure backend returns not connected
    await mockJiraStatus(page, false);

    // Step 3: Reload page so state is applied
    await page.goto("/task-manager-extension");

    // Step 4: User should see logged-out state
    await expect(page.getByText("Connect to Jira")).toBeVisible();
    await expect(page.getByRole("button", { name: "Connect" })).toBeVisible();

    // Step 5: Verify not connected
    await expect(page.getByText("Connected to Jira")).not.toBeVisible();
  });
});
