import { expect, type Page } from "@playwright/test";

import type { PlatformE2eConfig } from "../config/platform-e2e-config";
import { TestIds } from "../constants/test-ids";
import { APP_READY_TIMEOUT } from "../constants/timeouts";
import { toggleMultiSelectFilterOption } from "../utils/select-helpers";
import { clickChangeActiveScope, selectActiveProjectByLabel } from "./active-scope-page";

export type TaskListRowContent = {
  summary: string;
  status: string;
  priority?: string;
};

export async function assertTaskListFilters(page: Page): Promise<void> {
  await expect(page.getByTestId(TestIds.taskListFilters)).toBeVisible();
}

export async function assertCreateTaskButton(page: Page): Promise<void> {
  await expect(page.getByTestId(TestIds.createTaskButton)).toBeVisible();
}

export async function assertCreateTaskButtonEnabled(page: Page): Promise<void> {
  await expect(page.getByTestId(TestIds.createTaskButton)).toBeEnabled({
    timeout: APP_READY_TIMEOUT,
  });
}

export async function assertCreateTaskButtonDisabled(page: Page): Promise<void> {
  const wrapper = page.locator('[title="No permission to create issues"]');
  await expect(wrapper.getByTestId(TestIds.createTaskButton)).toBeDisabled({
    timeout: APP_READY_TIMEOUT,
  });
}

export async function clickCreateTaskButton(page: Page): Promise<void> {
  await page.getByTestId(TestIds.createTaskButton).click();
}

export async function assertTaskListSummaryVisible(page: Page, summary: string): Promise<void> {
  await expect(page.getByText(summary, { exact: true })).toBeVisible({
    timeout: APP_READY_TIMEOUT,
  });
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

async function waitForActiveScopeCardReady(page: Page): Promise<void> {
  await expect(page.getByTestId(TestIds.activeScopeCard)).toBeVisible({
    timeout: APP_READY_TIMEOUT,
  });
  await expect(
    page.getByTestId(TestIds.changeActiveScope).or(page.getByTestId(TestIds.resetActiveScope)),
  ).toBeVisible({
    timeout: APP_READY_TIMEOUT,
  });
}

async function ensureTaskListScopeEditorOpen(page: Page, scopeLabel: string): Promise<void> {
  await waitForActiveScopeCardReady(page);

  const projectSelect = page.getByTestId(TestIds.activeScopeProjectSelect);
  const combobox = projectSelect.getByRole("combobox", { name: scopeLabel });

  if (!(await combobox.isVisible())) {
    await clickChangeActiveScope(page);
  }

  await expect(combobox).toBeVisible({ timeout: APP_READY_TIMEOUT });
  await expect(combobox).toBeEnabled({ timeout: APP_READY_TIMEOUT });
}

async function waitForTaskListScopeEditorOptions(page: Page, scopeLabel: string): Promise<void> {
  await expect
    .poll(
      async () => {
        await ensureTaskListScopeEditorOpen(page, scopeLabel);

        const projectSelect = page.getByTestId(TestIds.activeScopeProjectSelect);
        const combobox = projectSelect.getByRole("combobox", { name: scopeLabel });
        await combobox.click();

        const listbox = page.locator('[role="listbox"]').last();
        const optionCount = await listbox.getByRole("option").count();
        await page.keyboard.press("Escape");
        return optionCount;
      },
      { timeout: APP_READY_TIMEOUT },
    )
    .toBeGreaterThan(0);
}

export async function assertTaskListScopeOptionsVisible(
  page: Page,
  scopeLabel: string,
  optionNames: string[],
): Promise<void> {
  await waitForTaskListScopeEditorOptions(page, scopeLabel);
  await ensureTaskListScopeEditorOpen(page, scopeLabel);

  const projectSelect = page.getByTestId(TestIds.activeScopeProjectSelect);
  const combobox = projectSelect.getByRole("combobox", { name: scopeLabel });
  await combobox.click();

  const listbox = page.locator('[role="listbox"]').last();
  await expect(listbox).toBeVisible({ timeout: APP_READY_TIMEOUT });

  for (const name of optionNames) {
    const roleOption = listbox.getByRole("option", { name });
    if ((await roleOption.count()) > 0) {
      await expect(roleOption).toBeVisible({ timeout: APP_READY_TIMEOUT });
      continue;
    }
    await expect(listbox.getByText(name, { exact: true })).toBeVisible({
      timeout: APP_READY_TIMEOUT,
    });
  }

  await page.keyboard.press("Escape");
}

export async function selectTaskListScopeByName(
  page: Page,
  scopeLabel: string,
  optionName: string,
): Promise<void> {
  await waitForTaskListScopeEditorOptions(page, scopeLabel);
  await ensureTaskListScopeEditorOpen(page, scopeLabel);
  await selectActiveProjectByLabel(page, scopeLabel, optionName);
}

export async function assertTaskListLoading(page: Page): Promise<void> {
  await expect(page.getByText("Loading tasks…")).toBeVisible();
}

export async function assertTaskListEmpty(page: Page): Promise<void> {
  await expect(page.getByText("No tasks in this project yet")).toBeVisible();
}

export async function assertTaskListError(page: Page): Promise<void> {
  await expect(
    page.getByText("Could not load tasks. Check your connection and try again."),
  ).toBeVisible();
}

export async function assertTaskListErrorAbsent(page: Page): Promise<void> {
  await expect(
    page.getByText("Could not load tasks. Check your connection and try again."),
  ).toHaveCount(0);
}

export async function assertTaskListRowContent(
  page: Page,
  taskKey: string,
  content: TaskListRowContent,
  platformConfig?: Pick<PlatformE2eConfig, "taskKeyDisplay">,
): Promise<void> {
  const row = page.getByTestId(TestIds.taskListRow(taskKey));
  await expect(row).toBeVisible();
  if ((platformConfig?.taskKeyDisplay ?? "key") === "key") {
    await expect(row.getByText(taskKey)).toBeVisible();
  }
  await expect(row.getByText(content.summary)).toBeVisible();
  await expect(row.getByText(content.status)).toBeVisible();
  if (content.priority) {
    await expect(row.getByText(content.priority)).toBeVisible();
  }
}
