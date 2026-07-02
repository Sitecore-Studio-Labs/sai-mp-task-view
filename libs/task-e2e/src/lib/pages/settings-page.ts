import { expect, type Page } from "@playwright/test";

import { TestIds } from "../constants/test-ids";

export async function openSettingsPanel(page: Page): Promise<void> {
  const dialog = page.getByTestId(TestIds.settingsPanelDialog);
  if (await dialog.isVisible()) {
    return;
  }

  await page.getByTestId(TestIds.openSettingsPanel).click();
  await expect(dialog).toBeVisible();
}

export async function openDisconnectConfirm(page: Page): Promise<void> {
  const dialog = page.getByTestId(TestIds.disconnectConfirmDialog);
  if (await dialog.isVisible()) {
    return;
  }

  const disconnectButton = page.getByTestId(TestIds.openDisconnectConfirm);
  await expect(disconnectButton).toBeVisible();
  await disconnectButton.scrollIntoViewIfNeeded();
  // Nested AlertDialog inside settings Dialog: the confirm overlay can appear mid-click and
  // block Playwright's actionability checks even though the dialog opened successfully.
  await disconnectButton.click({ force: true });
  await assertDisconnectDialog(page);
}

export async function assertDisconnectDialog(page: Page): Promise<void> {
  await expect(page.getByTestId(TestIds.disconnectConfirmDialog)).toBeVisible();
}

export async function confirmDisconnect(page: Page): Promise<void> {
  await page.getByTestId(TestIds.confirmDisconnect).click();
}

export async function cancelDisconnect(page: Page): Promise<void> {
  await page.getByTestId(TestIds.cancelDisconnect).click();
  await expect(page.getByTestId(TestIds.disconnectConfirmDialog)).toBeHidden();
}
