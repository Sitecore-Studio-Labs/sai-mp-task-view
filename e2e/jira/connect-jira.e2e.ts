import { expect, test } from "@playwright/test";

test.describe("Connect to Jira", () => {
  let connected = false;

  test.beforeEach(async ({ page }) => {
    await page.route("**/api/auth/jira/status", async (route) => {
      await route.fulfill({
        status: 200,
        contentType: "application/json",
        body: JSON.stringify({ connected }),
      });
    });

    await page.goto("/task-manager-extension");
  });

  test("Should be able to successfully log via successful authentication", async ({
    page,
    context,
  }) => {
    // Step 1: Verify user already logged out.
    await expect(page.getByText("Connect to Jira")).toBeVisible();
    await expect(page.getByRole("button", { name: "Connect" })).toBeVisible();

    // Step 2: Connect to Jira.
    connected = true;
    await page.getByRole("button", { name: "Connect" }).click();
    await page.evaluate(() => {
      window.postMessage({ type: "OAUTH_CONNECTED", platform: "Jira" }, window.location.origin);
    });

    // Step 3: Add cookies
    await context.addCookies([
      {
        name: "jira_user_id",
        value: "12345",
        domain: "localhost", // adjust if needed
        path: "/",
      },
    ]);

    // Step 4: Verify cookies
    const cookies = await context.cookies();
    const jiraCookie = cookies.find((c) => c.name === "jira_user_id");
    expect(jiraCookie).toBeDefined();
    expect(jiraCookie?.value).toBe("12345");

    // Step 5: Successfully connected to Jira.
    await expect(page.getByText("Connected to Jira")).toBeVisible();
  });

  test("If OAuth flow is interrupted, user remains logged out", async ({ page }) => {
    // Step 1: Verify user already logged out.
    await expect(page.getByText("Connect to Jira")).toBeVisible();

    // Step 2: Verify user already logged out.
    await page.getByRole("button", { name: "Connect" }).click();

    // Step 3: Simulate authentication failure / closing popup
    await page.evaluate(() => {
      window.postMessage({ type: "OAUTH_FAILED", platform: "Jira" }, window.location.origin);
    });

    // Step: Verify still user logged out
    await expect(page.getByText("Connect to Jira")).toBeVisible();
    await expect(page.getByRole("button", { name: "Connect" })).toBeVisible();
    await expect(page.getByText("Connected to Jira")).not.toBeVisible();
  });

  test("If the user already loggedin, user able to directly go to the application", async ({
    page,
    context,
  }) => {
    // Step 1: Verify user already logged in via cookies. Set cookie before loading the page
    await context.addCookies([
      {
        name: "jira_user_id",
        value: "12345",
        domain: "localhost",
        path: "/",
      },
    ]);

    // Setp 2: User is already connected
    connected = true;

    // Step 3: Reload page so cookie + route take effect
    await page.goto("/task-manager-extension");

    // Step 4: Successfully connected to Jira.
    await expect(page.getByText("Connected to Jira")).toBeVisible();
  });

  test("If jira_user_id cookie is missing, user should be logged out", async ({
    page,
    context,
  }) => {
    // Step 1: Ensure no cookies exist
    await context.clearCookies();

    // Step 2: Ensure backend returns not connected
    connected = false;

    // Step 3: Reload page so state is applied
    await page.goto("/task-manager-extension");

    // Step 4: User should see logged-out state
    await expect(page.getByText("Connect to Jira")).toBeVisible();
    await expect(page.getByRole("button", { name: "Connect" })).toBeVisible();

    // Step 5: Verify not connected
    await expect(page.getByText("Connected to Jira")).not.toBeVisible();
  });
});
