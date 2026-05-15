import { SYSTEMS } from "@mp/task-core";
import type { PlatformTaskE2EHarness } from "@mp/task-e2e";
import type { BrowserContext, Page } from "@playwright/test";

const connectAuthByPage = new WeakMap<Page, { connected: boolean }>();

export const JIRA_E2E_HARNESS: PlatformTaskE2EHarness = {
  platformKey: "jira",
  platformDisplayName: "Jira",
  oauthPopupPlatformLabel: SYSTEMS.JIRA,
  sessionCookieName: "jira_session_token",
  extensionPath: "/task-manager-extension",
  supportsTaskFlowMocks: false,
  capabilities: {
    hasIssueTypes: true,
    hasPriorities: true,
    hasAssignees: true,
    hasDueDate: true,
    hasParentIssue: true,
    hasAttachments: true,
    hasComments: true,
    hasSubtasks: true,
    hasStatusTransitions: true,
    hasAiWorkBreakdown: true,
    hasSites: true,
  },

  async navigateToExtension(page: Page): Promise<void> {
    await page.goto(JIRA_E2E_HARNESS.extensionPath, { waitUntil: "domcontentloaded" });
  },

  async simulateOAuthCompletion(page: Page): Promise<void> {
    await page.evaluate((label) => {
      window.postMessage({ type: "OAUTH_CONNECTED", platform: label }, window.location.origin);
    }, SYSTEMS.JIRA);
  },

  async seedSessionCookie(
    context: BrowserContext,
    baseURL: string,
    token = "12345",
  ): Promise<void> {
    await context.addCookies([
      {
        name: JIRA_E2E_HARNESS.sessionCookieName,
        value: token,
        url: baseURL,
      },
    ]);
  },

  async suppressRealOAuthPopups(page: Page): Promise<void> {
    await page.addInitScript(() => {
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      (window as any).open = () => ({ closed: false });
    });
  },

  async attachConnectLifecycleMocks(page: Page): Promise<void> {
    const state = { connected: false };
    connectAuthByPage.set(page, state);
    await page.unroute("**/api/auth/jira/status");
    await page.route("**/api/auth/jira/status", async (route) => {
      const st = connectAuthByPage.get(page) ?? state;
      await route.fulfill({
        status: 200,
        contentType: "application/json",
        body: JSON.stringify({ connected: st.connected }),
      });
    });
  },

  async setBackendReportsConnected(page: Page, connected: boolean): Promise<void> {
    const st = connectAuthByPage.get(page);
    if (st) st.connected = connected;
  },

  async attachDisconnectFlowMocks(
    browserContext: BrowserContext,
    page: Page,
    baseURL: string,
  ): Promise<void> {
    await browserContext.addCookies([
      { name: JIRA_E2E_HARNESS.sessionCookieName, value: "12345", url: baseURL },
    ]);

    await page.unroute("**/api/auth/jira/status");
    await page.route("**/api/auth/jira/status", async (route) => {
      const cookies = await browserContext.cookies();
      const connected = cookies.some((c) => c.name === JIRA_E2E_HARNESS.sessionCookieName);
      await route.fulfill({
        status: 200,
        contentType: "application/json",
        body: JSON.stringify({ connected }),
      });
    });

    await page.unroute("**/api/auth/jira/disconnect");
    await page.route("**/api/auth/jira/disconnect", async (route) => {
      await browserContext.clearCookies();
      await route.fulfill({
        status: 200,
        contentType: "application/json",
        body: JSON.stringify({ success: true }),
      });
    });
  },
};
