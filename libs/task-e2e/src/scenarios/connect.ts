import type { BrowserContext, Page } from "@playwright/test";
import { expect, test } from "@playwright/test";

import type { PlatformTaskE2EHarness } from "../harness.contract";

const playwrightBaseEnv = (): string => process.env.PLAYWRIGHT_BASE_URL ?? "http://localhost:3000";

function requireConnectMocks(h: PlatformTaskE2EHarness): void {
  if (!h.attachConnectLifecycleMocks || !h.setBackendReportsConnected) {
    throw new Error(
      `[${h.platformKey}-e2e] Implement attachConnectLifecycleMocks + setBackendReportsConnected on your harness.`,
    );
  }
}

export function registerConnectScenarios(harness: PlatformTaskE2EHarness): void {
  test.describe(`Connect (${harness.platformKey})`, () => {
    const setCookie = async (context: BrowserContext, page: Page, value: string) => {
      const hostname = new URL(page.url()).hostname;
      await context.addCookies([
        {
          name: harness.sessionCookieName,
          value,
          domain: hostname,
          path: "/",
        },
      ]);
    };

    test("successfully completes mocked OAuth handshake", async ({ page, context }) => {
      requireConnectMocks(harness);
      await harness.attachConnectLifecycleMocks!(page);
      await harness.setBackendReportsConnected!(page, false);
      await harness.navigateToExtension(page);

      await expect(page.getByTestId("connect-to-platform")).toBeVisible();
      await expect(page.getByTestId("connect-platform-account")).toBeVisible({
        timeout: 15_000,
      });

      await harness.setBackendReportsConnected!(page, true);
      await page.getByTestId("connect-platform-account").click();
      await harness.simulateOAuthCompletion(page);
      await setCookie(context, page, "12345");

      await expect(page.getByText(`Connected to ${harness.platformDisplayName}`)).toBeVisible({
        timeout: 15_000,
      });
    });

    test("OAuth interrupted — user stays logged out", async ({ page }) => {
      requireConnectMocks(harness);
      await harness.attachConnectLifecycleMocks!(page);
      await harness.setBackendReportsConnected!(page, false);
      await harness.navigateToExtension(page);

      await expect(page.getByTestId("connect-to-platform")).toBeVisible();
      await page.getByTestId("connect-platform-account").click();
      await expect(page.getByTestId("connect-to-platform")).toBeVisible();
      await expect(page.getByTestId("connect-platform-account")).toBeVisible({
        timeout: 15_000,
      });
      await expect(page.getByText(`Connected to ${harness.platformDisplayName}`)).not.toBeVisible();
    });

    test("already connected session restores the task manager directly", async ({
      page,
      context,
    }) => {
      requireConnectMocks(harness);
      await context.addCookies([
        {
          name: harness.sessionCookieName,
          value: "12345",
          url: playwrightBaseEnv(),
        },
      ]);
      await harness.attachConnectLifecycleMocks!(page);
      await harness.setBackendReportsConnected!(page, true);
      await harness.navigateToExtension(page);

      await expect(page.getByText(`Connected to ${harness.platformDisplayName}`)).toBeVisible({
        timeout: 15_000,
      });
    });

    test("missing session cookie shows connection screen", async ({ page, context }) => {
      requireConnectMocks(harness);
      await context.clearCookies();
      await harness.attachConnectLifecycleMocks!(page);
      await harness.setBackendReportsConnected!(page, false);
      await harness.navigateToExtension(page);

      await expect(page.getByTestId("connect-to-platform")).toBeVisible();
      await expect(page.getByTestId("connect-platform-account")).toBeVisible({
        timeout: 15_000,
      });

      await expect(page.getByText(`Connected to ${harness.platformDisplayName}`)).not.toBeVisible();
    });
  });
}
