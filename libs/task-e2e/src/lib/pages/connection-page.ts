import { expect, type Page } from "@playwright/test";

import type { PlatformE2eConfig } from "../config/platform-e2e-config";
import { TestIds } from "../constants/test-ids";

function resolveConnectButtonTestId(config: PlatformE2eConfig): string {
  return config.connectButtonTestId ?? TestIds.connectAccount;
}

export async function assertConnectionScreen(page: Page, config: PlatformE2eConfig): Promise<void> {
  await expect(page.getByTestId(TestIds.connectScreen(config.platformName))).toBeVisible();
}

export async function assertConnected(page: Page): Promise<void> {
  await expect(page.getByTestId(TestIds.connectionStatusBar)).toBeVisible();
}

export async function assertConnectButtonVisible(
  page: Page,
  config: PlatformE2eConfig,
): Promise<void> {
  await expect(page.getByTestId(resolveConnectButtonTestId(config))).toBeVisible();
}

export async function clickConnectAccount(page: Page, config: PlatformE2eConfig): Promise<void> {
  await page.getByTestId(resolveConnectButtonTestId(config)).click();
}

export async function assertBackOnConnectionScreen(
  page: Page,
  config: PlatformE2eConfig,
): Promise<void> {
  await assertConnectionScreen(page, config);
  await expect(page.getByTestId(TestIds.connectionStatusBar)).not.toBeVisible();
}
