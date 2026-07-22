import { expect, type Page } from "@playwright/test";

import type { PlatformE2eConfig } from "../config/platform-e2e-config";
import { TestIds } from "../constants/test-ids";
import { selectShadcnOptionByTestId } from "../utils/select-helpers";

export async function assertCreateTaskForm(page: Page): Promise<void> {
  await expect(page.getByTestId(TestIds.createTaskForm)).toBeVisible();
}

export async function assertEditTaskForm(page: Page): Promise<void> {
  await expect(page.getByTestId(TestIds.editTaskForm)).toBeVisible();
}

export async function assertEditTaskFormTitle(page: Page, title: string): Promise<void> {
  await expect(page.getByText(title, { exact: true })).toBeVisible();
}

export async function fillTaskSummary(page: Page, text: string): Promise<void> {
  await page.getByTestId(TestIds.taskSummaryField).fill(text);
}

export async function fillTaskDescription(page: Page, text: string): Promise<void> {
  const field = page.getByTestId(TestIds.taskDescriptionField);
  const textarea = field.locator("textarea");
  if (await textarea.count()) {
    await textarea.fill(text);
    return;
  }
  const editable = field.locator('[contenteditable="true"]');
  await editable.fill(text);
}

export async function selectTaskIssueType(page: Page, label: string): Promise<void> {
  await selectShadcnOptionByTestId(page, TestIds.taskIssueTypeField, label);
}

export async function selectTaskPriority(page: Page, label: string): Promise<void> {
  await selectShadcnOptionByTestId(page, TestIds.taskPriorityField, label);
}

export async function selectTaskAssignee(page: Page, label: string): Promise<void> {
  await selectShadcnOptionByTestId(page, TestIds.taskAssigneeField, label);
}

export async function selectParentIssue(page: Page, label: string): Promise<void> {
  await selectShadcnOptionByTestId(page, TestIds.taskParentIssueField, label);
}

export async function fillTaskDueDate(page: Page, dayLabel: string): Promise<void> {
  await page.getByTestId(TestIds.taskDueDateField).click();
  await page.getByRole("gridcell", { name: dayLabel }).click();
}

export async function submitTaskForm(page: Page): Promise<void> {
  await page.getByTestId(TestIds.taskFormSubmitButton).click();
}

export async function cancelTaskForm(page: Page): Promise<void> {
  await page.getByTestId(TestIds.taskFormCancelButton).click();
}

export async function clickTaskFormBack(page: Page): Promise<void> {
  await page.getByTestId(TestIds.taskFormBackButton).click();
}

export interface MinimalTaskFormInput {
  summary: string;
  issueTypeLabel?: string;
}

export async function fillMinimalCreateForm(
  page: Page,
  config: PlatformE2eConfig,
  input: MinimalTaskFormInput,
): Promise<void> {
  await fillTaskSummary(page, input.summary);
  if (config.hasIssueTypes && input.issueTypeLabel) {
    await selectTaskIssueType(page, input.issueTypeLabel);
  }
}

export async function fillMinimalEditForm(
  page: Page,
  config: PlatformE2eConfig,
  input: MinimalTaskFormInput,
): Promise<void> {
  await fillMinimalCreateForm(page, config, input);
}

export async function assertTaskAttachmentsField(page: Page): Promise<void> {
  await expect(page.getByTestId(TestIds.taskAttachmentsField)).toBeVisible();
}

export async function attachTaskFiles(
  page: Page,
  filename: string,
  content = "e2e attachment content",
): Promise<void> {
  await page.getByTestId(TestIds.taskAttachmentsInput).setInputFiles({
    name: filename,
    mimeType: "application/pdf",
    buffer: Buffer.from(content),
  });
}

export async function assertTaskAttachmentPendingFilename(
  page: Page,
  filename: string,
): Promise<void> {
  await expect(page.getByTestId(TestIds.taskAttachmentsField).getByText(filename)).toBeVisible();
}

export async function assertTaskFormExistingAttachment(
  page: Page,
  filename: string,
): Promise<void> {
  await expect(page.getByRole("link", { name: filename })).toBeVisible();
}

export async function assertTaskFormExistingAttachmentHidden(
  page: Page,
  filename: string,
): Promise<void> {
  await expect(page.getByRole("link", { name: filename })).not.toBeVisible();
}

export async function clickDeleteTaskAttachment(page: Page, filename: string): Promise<void> {
  await page.getByRole("button", { name: `Delete attachment ${filename}` }).click();
}
