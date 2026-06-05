import { expect, type Page } from "@playwright/test";

import type { PlatformE2eConfig } from "../config/platform-e2e-config";
import { TestIds } from "../constants/test-ids";

export async function gotoTaskManager(page: Page, config: PlatformE2eConfig): Promise<void> {
  await page.goto(config.taskManagerPath);
}

export async function waitForConnectionScreen(
  page: Page,
  config: PlatformE2eConfig,
): Promise<void> {
  await expect(page.getByTestId(TestIds.connectScreen(config.platformName))).toBeVisible();
}

export async function waitForConnectedApp(page: Page): Promise<void> {
  await expect(page.getByTestId(TestIds.connectionStatusBar)).toBeVisible();
}
