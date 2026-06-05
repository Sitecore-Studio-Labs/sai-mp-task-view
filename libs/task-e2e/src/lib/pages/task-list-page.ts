import { expect, type Page } from "@playwright/test";

import { TestIds } from "../constants/test-ids";
import { toggleMultiSelectFilterOption } from "../utils/select-helpers";

export async function assertTaskListFilters(page: Page): Promise<void> {
  await expect(page.getByTestId(TestIds.taskListFilters)).toBeVisible();
}

export async function assertCreateTaskButton(page: Page): Promise<void> {
  await expect(page.getByTestId(TestIds.createTaskButton)).toBeVisible();
}

export async function clickCreateTaskButton(page: Page): Promise<void> {
  await page.getByTestId(TestIds.createTaskButton).click();
}

export async function clickTaskListRow(page: Page, taskKey: string): Promise<void> {
  await page.getByTestId(TestIds.taskListRow(taskKey)).click();
}

export async function assertTaskListRowVisible(page: Page, taskKey: string): Promise<void> {
  await expect(page.getByTestId(TestIds.taskListRow(taskKey))).toBeVisible();
}

export async function assertTaskListRowHidden(page: Page, taskKey: string): Promise<void> {
  await expect(page.getByTestId(TestIds.taskListRow(taskKey))).not.toBeVisible();
}

export async function clickTaskListLoadMore(page: Page): Promise<void> {
  await page.getByTestId(TestIds.taskListLoadMore).click();
}

export async function clickErrorRetry(page: Page): Promise<void> {
  await page.getByTestId(TestIds.errorRetryButton).click();
}

export async function openStatusFilter(page: Page): Promise<void> {
  await page.getByTestId(TestIds.taskFilterStatus).click();
}

export async function openPriorityFilter(page: Page): Promise<void> {
  await page.getByTestId(TestIds.taskFilterPriority).click();
}

export async function openAssigneeFilter(page: Page): Promise<void> {
  await page.getByTestId(TestIds.taskFilterAssignee).click();
}

export async function selectStatusFilterOption(page: Page, optionLabel: string): Promise<void> {
  await toggleMultiSelectFilterOption(page, TestIds.taskFilterStatus, optionLabel);
}

export async function selectPriorityFilterOption(page: Page, optionLabel: string): Promise<void> {
  await toggleMultiSelectFilterOption(page, TestIds.taskFilterPriority, optionLabel);
}

export async function selectAssigneeFilterOption(page: Page, optionLabel: string): Promise<void> {
  await toggleMultiSelectFilterOption(page, TestIds.taskFilterAssignee, optionLabel);
}
