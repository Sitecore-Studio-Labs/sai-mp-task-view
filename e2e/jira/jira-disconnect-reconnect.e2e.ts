import { BrowserContext, expect, test } from "@playwright/test";

const setJiraCookie = async (context: BrowserContext, baseURL: string, value: string) => {
  await context.addCookies([
    {
      name: "jira_session_token",
      value,
      url: `${baseURL}`,
    },
  ]);
};

test.describe("Jira connection: disconnect + reconnect", () => {
  test.beforeEach(async ({ page, context, baseURL }) => {
    // Prevent real popup navigation
    await page.addInitScript(() => {
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      (window as any).open = () => ({ closed: false });
    });

    await context.addCookies([{ name: "jira_session_token", value: "12345", url: baseURL! }]);

    await page.route("**/api/auth/jira/status", async (route) => {
      const cookies = await context.cookies();
      const connected = cookies.some((c) => c.name === "jira_session_token");
      await route.fulfill({
        status: 200,
        contentType: "application/json",
        body: JSON.stringify({ connected }),
      });
    });

    await page.route("**/api/auth/jira/disconnect", async (route) => {
      // clear cookie on disconnect
      await context.clearCookies();
      await route.fulfill({
        status: 200,
        contentType: "application/json",
        body: JSON.stringify({ success: true }),
      });
    });

    await page.goto("/task-manager-extension");
  });

  test("Disconnects Jira (with cancel) and can reconnect", async ({ page, context, baseURL }) => {
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
    const disconnectResponse = page.waitForResponse(
      (res) =>
        res.url().includes("/api/auth/jira/disconnect") &&
        res.request().method() === "POST" &&
        res.status() === 200,
    );
    await page.getByRole("button", { name: "Disconnect" }).click();
    await disconnectResponse;

    // Step: 4: Verify cookie is cleared (handler runs clearCookies before fulfill)
    const cookies = await context.cookies();
    const jiraCookie = cookies.find((c) => c.name === "jira_session_token");
    expect(jiraCookie).toBeUndefined();

    // Step 5: Observe connection status.
    await expect(page.getByText("Not connected")).toBeVisible();

    // Step 6: App prompts to connect (no crash).
    await expect(page.getByText("Connect to Jira")).toBeVisible();
    await expect(page.getByRole("button", { name: "Connect" })).toBeVisible({
      timeout: 15_000,
    });

    // Step 7: Reconnect (simulate Story 1 OAuth completion via postMessage).
    await setJiraCookie(context, baseURL!, "12345");

    await page.getByRole("button", { name: "Connect" }).click();
    await page.evaluate(() => {
      window.postMessage({ type: "OAUTH_CONNECTED", platform: "Jira" }, window.location.origin);
    });

    // Step 8: Verify user connected
    await expect(page.getByText("Connected to Jira")).toBeVisible();
  });
});
