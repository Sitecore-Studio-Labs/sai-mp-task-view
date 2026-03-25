import { BrowserContext, expect, Page, test } from "@playwright/test";

const setupJiraMocks = async (page: Page, context: BrowserContext) => {
  await page.route("**/api/auth/jira/status", async (route) => {
    const cookies = await context.cookies();
    const jiraCookie = cookies.find((c) => c.name === "jira_user_id");

    const connected = Boolean(jiraCookie);

    await route.fulfill({
      status: 200,
      contentType: "application/json",
      body: JSON.stringify({ connected }),
    });
  });
};

const setJiraCookie = async (
  context: BrowserContext,
  baseURL: string,
  page: Page,
  value: string,
) => {
  await context.addCookies([
    {
      name: "jira_user_id",
      value,
      url: `${baseURL}`,
    },
  ]);
};

const clearCookies = async (context: BrowserContext, page: Page) => {
  await page.route("**/api/auth/jira/disconnect", async (route) => {
    // Simulate backend clearing cookie (optional but realistic)
    await context.clearCookies();

    await route.fulfill({
      status: 200,
      contentType: "application/json",
      body: JSON.stringify({ success: true }),
    });
  });
};

test.describe("Jira connection: disconnect + reconnect", () => {
  test.beforeEach(async ({ page, context, baseURL }) => {
    // Prevent real popup navigation during e2e.
    await page.addInitScript(() => {
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      (window as any).open = () => ({ closed: false });
    });
    await setJiraCookie(context, baseURL!, page, "12345");
    await setupJiraMocks(page, context);
    await page.goto("/task-manager-extension");
  });

  test("Disconnects Jira (with cancel) and can reconnect", async ({ page, context, baseURL }) => {
    expect(true).toBeTruthy();

    // Step 1: Ensure Jira is connected.
    await expect(page.getByText("Connected to Jira")).toBeVisible();

    // Step 2: Open connection options.
    await page.getByRole("button", { name: "Connection options" }).click();

    // Step 3: Click Disconnect -> dialog appears.
    const menuItem1 = await page.getByRole("menuitem", { name: "Disconnect" });
    await menuItem1.focus();
    await menuItem1.press("Enter");
    await expect(page.getByRole("heading", { name: "Disconnect Jira" })).toBeVisible();

    // Edge case: cancel confirmation -> still connected.
    await page.getByRole("button", { name: "Cancel" }).click();
    await expect(page.getByText("Connected to Jira")).toBeVisible();

    // Disconnect for real.
    await page.getByRole("button", { name: "Connection options" }).click();
    const menuItem2 = await page.getByRole("menuitem", { name: "Disconnect" });
    await menuItem2.focus();
    await menuItem2.press("Enter");
    await page.getByRole("button", { name: "Disconnect" }).click();

    // Step 5: Clear cookies
    await clearCookies(context, page);

    // Step: 6: Verify cookie is cleared
    const cookies = await context.cookies();
    const jiraCookie = cookies.find((c) => c.name === "jira_user_id");
    expect(jiraCookie).toBeUndefined();

    // Step 7: Observe connection status.
    await expect(page.getByText("Not connected")).toBeVisible();

    // Step 8: App prompts to connect (no crash).
    await expect(page.getByText("Connect to Jira")).toBeVisible();
    await expect(page.getByRole("button", { name: "Connect" })).toBeVisible();

    // Step 9: Reconnect (simulate Story 1 OAuth completion via postMessage).
    await setJiraCookie(context, baseURL!, page, "12345");

    // await page.getByRole("button", { name: "Connect" }).click();
    await page.evaluate(() => {
      window.postMessage({ type: "OAUTH_CONNECTED", platform: "Jira" }, window.location.origin);
    });

    await expect(page.getByText("Connected to Jira")).toBeVisible();
  });
});
