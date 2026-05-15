import { expect, test } from "@playwright/test";

import type { PlatformTaskE2EHarness } from "../harness.contract";

export function registerDisconnectReconnectScenarios(harness: PlatformTaskE2EHarness): void {
  const describeBlock =
    harness.attachDisconnectFlowMocks != null ? test.describe : test.describe.skip;

  describeBlock(
    `Disconnect + reconnect (${harness.platformKey}${
      harness.attachDisconnectFlowMocks == null
        ? " — scaffold attachDisconnectFlowMocks() first"
        : ""
    })`,
    () => {
      test.beforeEach(async ({ page, context, baseURL }) => {
        if (harness.suppressRealOAuthPopups) {
          await harness.suppressRealOAuthPopups(page);
        }
        await harness.attachDisconnectFlowMocks!(context, page, baseURL!);
        await page.goto(harness.extensionPath);
      });

      test("disconnect (with cancel) then reconnect", async ({ page, context, baseURL }) => {
        await expect(page.getByText(`Connected to ${harness.platformDisplayName}`)).toBeVisible();

        await page.getByRole("button", { name: "Connection options" }).click();
        const firstMenu = page.getByRole("menuitem", { name: "Disconnect" });
        await firstMenu.focus();
        await firstMenu.press("Enter");
        await expect(
          page.getByRole("heading", { name: `Disconnect ${harness.platformDisplayName}` }),
        ).toBeVisible();

        await page.getByRole("button", { name: "Cancel" }).click();
        await expect(page.getByText(`Connected to ${harness.platformDisplayName}`)).toBeVisible();

        await page.getByRole("button", { name: "Connection options" }).click();
        const secondMenu = page.getByRole("menuitem", { name: "Disconnect" });
        await secondMenu.focus();
        await secondMenu.press("Enter");
        const disconnectResponse = page.waitForResponse(
          (res) =>
            res.url().includes(`/api/auth/${harness.platformKey}/disconnect`) &&
            res.request().method() === "POST" &&
            res.status() === 200,
        );
        await page.getByRole("button", { name: "Disconnect" }).click();
        await disconnectResponse;

        const cookies = await context.cookies();
        const session = cookies.find((c) => c.name === harness.sessionCookieName);
        expect(session).toBeUndefined();

        await expect(page.getByTestId("connect-to-platform")).toBeVisible();
        await expect(page.getByTestId("connect-platform-account")).toBeVisible({
          timeout: 15_000,
        });

        await harness.seedSessionCookie(context, baseURL!, "12345");
        await page.getByTestId("connect-platform-account").click();
        await harness.simulateOAuthCompletion(page);

        await expect(page.getByText(`Connected to ${harness.platformDisplayName}`)).toBeVisible();
      });
    },
  );
}
