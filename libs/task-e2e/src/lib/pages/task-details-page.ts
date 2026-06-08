import { expect, type Page } from "@playwright/test";

import { TestIds } from "../constants/test-ids";
import { APP_READY_TIMEOUT } from "../constants/timeouts";
import { selectShadcnOptionByTestId } from "../utils/select-helpers";

function taskDetailsPanel(page: Page) {
  return page.getByTestId(TestIds.taskDetailsPanel);
}

export async function assertTaskDetailsPanel(page: Page): Promise<void> {
  await expect(taskDetailsPanel(page)).toBeVisible({ timeout: APP_READY_TIMEOUT });
}

export async function assertTaskDetailsDialog(page: Page): Promise<void> {
  await expect(page.getByRole("dialog", { name: "Task Details" })).toBeVisible({
    timeout: APP_READY_TIMEOUT,
  });
  await assertTaskDetailsPanel(page);
}

export async function assertTaskDetailsHidden(page: Page): Promise<void> {
  await expect(taskDetailsPanel(page)).toBeHidden({ timeout: APP_READY_TIMEOUT });
}

export async function assertTaskDetailsLoading(page: Page): Promise<void> {
  await expect(page.getByText("Loading task…", { exact: true })).toBeVisible({
    timeout: APP_READY_TIMEOUT,
  });
}

export async function assertTaskDetailsLoadingHidden(page: Page): Promise<void> {
  await expect(page.getByText("Loading task…", { exact: true })).toBeHidden({
    timeout: APP_READY_TIMEOUT,
  });
}

export async function assertTaskDetailsSummary(page: Page, summary: string): Promise<void> {
  await expect(taskDetailsPanel(page).getByRole("heading", { name: summary })).toBeVisible({
    timeout: APP_READY_TIMEOUT,
  });
}

export async function assertTaskDetailsText(page: Page, text: string): Promise<void> {
  await expect(taskDetailsPanel(page).getByText(text, { exact: true })).toBeVisible({
    timeout: APP_READY_TIMEOUT,
  });
}

export async function assertTaskDetailsParentKey(page: Page, parentKey: string): Promise<void> {
  await expect(taskDetailsPanel(page).getByRole("button", { name: parentKey })).toBeVisible({
    timeout: APP_READY_TIMEOUT,
  });
}

export async function assertTaskDetailsIssueKey(page: Page, issueKey: string): Promise<void> {
  await expect(taskDetailsPanel(page).getByText(issueKey, { exact: true })).toBeVisible({
    timeout: APP_READY_TIMEOUT,
  });
}

export async function assertTaskDetailsFieldHeading(page: Page, heading: string): Promise<void> {
  await expect(taskDetailsPanel(page).getByRole("heading", { name: heading })).toBeVisible({
    timeout: APP_READY_TIMEOUT,
  });
}

export async function assertTaskDetailsSubtasksHeading(page: Page, count: number): Promise<void> {
  await expect(
    taskDetailsPanel(page).getByText(`Subtasks (${count})`, { exact: true }),
  ).toBeVisible({ timeout: APP_READY_TIMEOUT });
}

export async function assertTaskDetailsNoComments(page: Page): Promise<void> {
  await expect(taskDetailsPanel(page).getByText("No comments yet.", { exact: true })).toBeVisible({
    timeout: APP_READY_TIMEOUT,
  });
}

export async function assertTaskDetailsCommentsHeading(page: Page, count: number): Promise<void> {
  await expect(
    taskDetailsPanel(page).getByText(`Comments (${count})`, { exact: true }),
  ).toBeVisible({ timeout: APP_READY_TIMEOUT });
}

export async function assertTaskDetailsAuthorComment(page: Page): Promise<void> {
  await expect(taskDetailsPanel(page).getByTestId("author-comment")).toBeVisible({
    timeout: APP_READY_TIMEOUT,
  });
}

export async function assertTaskDetailsEditButton(page: Page): Promise<void> {
  await expect(page.getByTestId(TestIds.editTaskButton)).toBeVisible({
    timeout: APP_READY_TIMEOUT,
  });
}

export async function assertTaskDetailsDeleteButton(page: Page): Promise<void> {
  await expect(page.getByTestId(TestIds.openDeleteTaskConfirm)).toBeVisible({
    timeout: APP_READY_TIMEOUT,
  });
}

export async function assertTaskDetailsDeleteButtonEnabled(page: Page): Promise<void> {
  await expect(page.getByTestId(TestIds.openDeleteTaskConfirm)).toBeEnabled({
    timeout: APP_READY_TIMEOUT,
  });
}

export async function assertTaskDetailsDeleteButtonDisabled(page: Page): Promise<void> {
  const panel = taskDetailsPanel(page);
  const deleteWrapper = panel.locator('[title="No permission to delete"]');
  await expect(deleteWrapper.getByRole("button", { name: "Delete" })).toBeDisabled({
    timeout: APP_READY_TIMEOUT,
  });
}

export async function assertDeleteTaskDialogHidden(page: Page): Promise<void> {
  await expect(page.getByTestId(TestIds.deleteTaskConfirmDialog)).toBeHidden({
    timeout: APP_READY_TIMEOUT,
  });
}

export async function clickCloseTaskDetails(page: Page): Promise<void> {
  await page.getByRole("button", { name: "Close" }).click();
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
