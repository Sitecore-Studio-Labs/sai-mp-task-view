import { expect, type Page } from "@playwright/test";

import { TestIds } from "../constants/test-ids";
import { APP_READY_TIMEOUT } from "../constants/timeouts";

async function waitForSettingsPanelReady(page: Page): Promise<void> {
  const dialog = page.getByTestId(TestIds.settingsPanelDialog);
  const disconnectButton = dialog.getByTestId(TestIds.openDisconnectConfirm);
  const mappingsSection = dialog.getByTestId(TestIds.websiteMappingsSection);

  if ((await mappingsSection.count()) > 0) {
    await expect(mappingsSection).toBeVisible();
    // Best-effort: WebsiteMappingsSection skeletons depend on the Marketplace SDK, which is
    // unavailable in E2E. Do not block the disconnect flow when they never resolve.
    await expect(dialog.locator('[data-slot="skeleton"]'))
      .toHaveCount(0, { timeout: 5_000 })
      .catch(() => undefined);
  }

  await expect(disconnectButton).toBeVisible({ timeout: APP_READY_TIMEOUT });
  await disconnectButton.scrollIntoViewIfNeeded();
}

export async function openSettingsPanel(page: Page): Promise<void> {
  const dialog = page.getByTestId(TestIds.settingsPanelDialog);
  if (await dialog.isVisible()) {
    await waitForSettingsPanelReady(page);
    return;
  }

  await page.getByTestId(TestIds.openSettingsPanel).click();
  await expect(dialog).toBeVisible();
  await waitForSettingsPanelReady(page);
}

export async function openDisconnectConfirm(page: Page): Promise<void> {
  const settingsPanel = page.getByTestId(TestIds.settingsPanelDialog);
  const dialog = page.getByTestId(TestIds.disconnectConfirmDialog);
  const disconnectButton = settingsPanel.getByTestId(TestIds.openDisconnectConfirm);

  await expect(settingsPanel).toBeVisible();
  await expect(disconnectButton).toBeVisible({ timeout: APP_READY_TIMEOUT });

  await expect(async () => {
    if (await dialog.isVisible()) {
      return;
    }

    await disconnectButton.scrollIntoViewIfNeeded();
    // Nested AlertDialog inside settings Dialog: the overlay can block Playwright's click
    // actionability checks even when React opened the confirm dialog successfully.
    await disconnectButton.click({ timeout: 3_000 }).catch(() => undefined);
    await expect(dialog).toBeVisible({ timeout: 1_000 });
  }).toPass({ timeout: APP_READY_TIMEOUT });

  await assertDisconnectDialog(page);
}

export async function assertDisconnectDialog(page: Page): Promise<void> {
  await expect(page.getByTestId(TestIds.disconnectConfirmDialog)).toBeVisible({
    timeout: APP_READY_TIMEOUT,
  });
}

export async function confirmDisconnect(page: Page): Promise<void> {
  await page.getByTestId(TestIds.confirmDisconnect).click();
}

export async function cancelDisconnect(page: Page): Promise<void> {
  await page.getByTestId(TestIds.cancelDisconnect).click();
  await expect(page.getByTestId(TestIds.disconnectConfirmDialog)).toBeHidden();
}
