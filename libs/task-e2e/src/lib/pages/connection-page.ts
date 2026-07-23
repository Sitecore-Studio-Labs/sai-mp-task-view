import { expect, type Page } from "@playwright/test";

import type { PlatformE2eConfig } from "../config/platform-e2e-config";
import { TestIds } from "../constants/test-ids";
import { APP_READY_TIMEOUT } from "../constants/timeouts";

function resolveConnectButtonTestId(config: PlatformE2eConfig): string {
  return config.connectButtonTestId ?? TestIds.connectAccount;
}

export async function assertConnectionScreen(page: Page, config: PlatformE2eConfig): Promise<void> {
  await expect(page.getByTestId(TestIds.connectScreen(config.platformName))).toBeVisible({
    timeout: APP_READY_TIMEOUT,
  });
}

export async function assertConnectionScreenTitle(
  page: Page,
  config: PlatformE2eConfig,
): Promise<void> {
  if (!config.connectionTitle) {
    return;
  }

  await expect(page.getByTestId(TestIds.connectScreen(config.platformName))).toHaveText(
    config.connectionTitle,
    { timeout: APP_READY_TIMEOUT },
  );
}

export async function assertConnected(page: Page): Promise<void> {
  await expect(page.getByTestId(TestIds.connectionStatusBar)).toBeVisible();
}

export async function assertConnectButtonVisible(
  page: Page,
  config: PlatformE2eConfig,
): Promise<void> {
  await expect(page.getByTestId(resolveConnectButtonTestId(config))).toBeVisible({
    timeout: APP_READY_TIMEOUT,
  });
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

/** Assert the disconnected connection screen and connect button are visible. */
export async function assertDisconnected(page: Page, config: PlatformE2eConfig): Promise<void> {
  await assertConnectionScreen(page, config);
  await assertConnectButtonVisible(page, config);
}

/** Assert the platform logo on the connection screen matches capabilities (shown or absent). */
export async function assertConnectionPlatformLogo(
  page: Page,
  config: PlatformE2eConfig,
): Promise<void> {
  if (config.hasPlatformLogo === undefined) {
    return;
  }

  const logo = page.getByTestId(TestIds.connectionPlatformLogo);

  if (config.hasPlatformLogo) {
    await expect(logo).toBeVisible({ timeout: APP_READY_TIMEOUT });
  } else {
    await expect(logo).not.toBeVisible();
  }
}
