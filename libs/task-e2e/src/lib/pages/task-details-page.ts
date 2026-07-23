import { expect, type Page } from "@playwright/test";

import type { PlatformE2eConfig } from "../config/platform-e2e-config";
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

export async function assertTaskDetailsParentKey(
  page: Page,
  parentKey: string,
  platformConfig?: Pick<PlatformE2eConfig, "taskKeyDisplay">,
  parentSummary = "Parent issue",
): Promise<void> {
  const label = platformConfig?.taskKeyDisplay === "summary" ? parentSummary : parentKey;
  await expect(taskDetailsPanel(page).getByRole("button", { name: label })).toBeVisible({
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
  await expect(
    taskDetailsPanel(page).getByTestId(TestIds.taskCommentsSection).getByText("No comments yet.", {
      exact: true,
    }),
  ).toBeVisible({
    timeout: APP_READY_TIMEOUT,
  });
}

export async function assertTaskDetailsCommentsSection(page: Page): Promise<void> {
  await expect(taskDetailsPanel(page).getByTestId(TestIds.taskCommentsSection)).toBeVisible({
    timeout: APP_READY_TIMEOUT,
  });
}

export async function assertTaskDetailsCommentsHeading(page: Page, count: number): Promise<void> {
  await expect(
    taskDetailsPanel(page).getByText(`Comments (${count})`, { exact: true }),
  ).toBeVisible({ timeout: APP_READY_TIMEOUT });
}

export async function assertTaskDetailsAuthorComment(
  page: Page,
  authorDisplayName?: string,
): Promise<void> {
  const author = taskDetailsPanel(page).getByTestId(TestIds.authorComment);
  if (authorDisplayName) {
    await expect(author.filter({ hasText: authorDisplayName })).toBeVisible({
      timeout: APP_READY_TIMEOUT,
    });
    return;
  }

  await expect(author).toBeVisible({
    timeout: APP_READY_TIMEOUT,
  });
}

export async function assertTaskDetailsCommentText(page: Page, text: string): Promise<void> {
  await expect(
    taskDetailsPanel(page)
      .getByTestId(TestIds.taskCommentsSection)
      .getByText(text, { exact: true }),
  ).toBeVisible({ timeout: APP_READY_TIMEOUT });
}

export async function fillAddCommentInput(page: Page, text: string): Promise<void> {
  await taskDetailsPanel(page).getByTestId(TestIds.addCommentInput).fill(text);
}

export async function clickPostComment(page: Page): Promise<void> {
  await taskDetailsPanel(page).getByTestId(TestIds.postCommentButton).click();
}

export async function addTaskComment(page: Page, text: string): Promise<void> {
  await fillAddCommentInput(page, text);
  await clickPostComment(page);
}

export async function clickReplyOnComment(page: Page, authorDisplayName: string): Promise<void> {
  const panel = taskDetailsPanel(page);
  const author = panel.getByTestId(TestIds.authorComment).filter({ hasText: authorDisplayName });
  const commentCard = author.locator("xpath=ancestor::div[contains(@class,'items-start')][1]");
  await commentCard.getByRole("button", { name: "Comment options" }).click();
  await page.getByRole("menuitem", { name: "Reply" }).click();
}

export async function assertReplyingToComment(
  page: Page,
  authorDisplayName: string,
): Promise<void> {
  const replyBanner = taskDetailsPanel(page).getByText("Replying to", { exact: false });
  await expect(replyBanner).toBeVisible({ timeout: APP_READY_TIMEOUT });
  await expect(replyBanner.getByText(authorDisplayName, { exact: true })).toBeVisible({
    timeout: APP_READY_TIMEOUT,
  });
}

export async function assertTaskDetailsEditButton(page: Page): Promise<void> {
  await expect(page.getByTestId(TestIds.editTaskButton)).toBeVisible({
    timeout: APP_READY_TIMEOUT,
  });
}

export async function assertTaskDetailsEditButtonEnabled(page: Page): Promise<void> {
  await expect(page.getByTestId(TestIds.editTaskButton)).toBeEnabled({
    timeout: APP_READY_TIMEOUT,
  });
}

export async function assertTaskDetailsEditButtonDisabled(page: Page): Promise<void> {
  const panel = taskDetailsPanel(page);
  const editWrapper = panel.locator('[title="No permission to edit"]');
  await expect(editWrapper.getByRole("button", { name: "Edit" })).toBeDisabled({
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
  const statusSelect = page.getByTestId(TestIds.taskStatusSelect);
  await expect(statusSelect).toBeEnabled({ timeout: APP_READY_TIMEOUT });
  await selectShadcnOptionByTestId(page, TestIds.taskStatusSelect, statusLabel);
}

export async function assertTaskDetailsStatusSelect(page: Page): Promise<void> {
  const statusSelect = taskDetailsPanel(page).getByTestId(TestIds.taskStatusSelect);
  await expect(statusSelect).toBeVisible({ timeout: APP_READY_TIMEOUT });
  await expect(statusSelect).toBeEnabled({ timeout: APP_READY_TIMEOUT });
}

export async function assertTaskDetailsStatus(page: Page, statusName: string): Promise<void> {
  const panel = taskDetailsPanel(page);
  const statusSelect = panel.getByTestId(TestIds.taskStatusSelect);

  if ((await statusSelect.count()) > 0) {
    await expect(statusSelect).toContainText(statusName, { timeout: APP_READY_TIMEOUT });
    return;
  }

  await expect(panel.getByText(statusName, { exact: true }).first()).toBeVisible({
    timeout: APP_READY_TIMEOUT,
  });
}

export async function assertTaskDetailsAttachmentFilename(
  page: Page,
  filename: string,
): Promise<void> {
  await expect(taskDetailsPanel(page).getByRole("link", { name: filename })).toBeVisible({
    timeout: APP_READY_TIMEOUT,
  });
}
