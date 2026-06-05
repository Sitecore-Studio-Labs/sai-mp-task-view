import { expect, type Page } from "@playwright/test";

import { TestIds } from "../constants/test-ids";
import { selectShadcnOptionByTestId } from "../utils/select-helpers";

export async function assertTaskDetailsPanel(page: Page): Promise<void> {
  await expect(page.getByTestId(TestIds.taskDetailsPanel)).toBeVisible();
}

export async function clickEditTask(page: Page): Promise<void> {
  await page.getByTestId(TestIds.editTaskButton).click();
}

export async function clickOpenDeleteTaskConfirm(page: Page): Promise<void> {
  await page.getByTestId(TestIds.openDeleteTaskConfirm).click();
  await assertDeleteTaskDialog(page);
}

export async function assertDeleteTaskDialog(page: Page): Promise<void> {
  await expect(page.getByTestId(TestIds.deleteTaskConfirmDialog)).toBeVisible();
}

export async function confirmDeleteTask(page: Page): Promise<void> {
  await page.getByTestId(TestIds.confirmDeleteTask).click();
}

export async function cancelDeleteTask(page: Page): Promise<void> {
  await page.getByTestId(TestIds.cancelDeleteTask).click();
}

export async function changeTaskStatus(page: Page, statusLabel: string): Promise<void> {
  await selectShadcnOptionByTestId(page, TestIds.taskStatusSelect, statusLabel);
}
