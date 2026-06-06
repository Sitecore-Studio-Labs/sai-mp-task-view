import { expect, type Page } from "@playwright/test";

import type { PlatformE2eConfig } from "../config/platform-e2e-config";
import { TestIds } from "../constants/test-ids";
import { APP_READY_TIMEOUT } from "../constants/timeouts";

export async function gotoTaskManager(page: Page, config: PlatformE2eConfig): Promise<void> {
  const statusResponse = config.connectionStatusApiPath
    ? page.waitForResponse(
        (response) => response.url().includes(config.connectionStatusApiPath!) && response.ok(),
        { timeout: APP_READY_TIMEOUT },
      )
    : null;

  await page.goto(config.taskManagerPath, { waitUntil: "domcontentloaded" });

  if (statusResponse) {
    await statusResponse;
  }
}

export async function waitForConnectionScreen(
  page: Page,
  config: PlatformE2eConfig,
): Promise<void> {
  await expect(page.getByTestId(TestIds.connectScreen(config.platformName))).toBeVisible({
    timeout: APP_READY_TIMEOUT,
  });
}

export async function waitForConnectedApp(page: Page): Promise<void> {
  await expect(page.getByTestId(TestIds.connectionStatusBar)).toBeVisible();
}
