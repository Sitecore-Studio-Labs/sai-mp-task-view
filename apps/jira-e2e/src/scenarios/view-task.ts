import type { PlatformE2eScenarioContext } from "task-e2e";
import {
  assertConnectedLabel,
  assertTaskDetailsDeleteButton,
  assertTaskDetailsDialog,
  assertTaskDetailsEditButton,
  assertTaskDetailsFieldHeading,
  assertTaskDetailsHidden,
  assertTaskDetailsIssueKey,
  assertTaskDetailsLoading,
  assertTaskDetailsLoadingHidden,
  assertTaskDetailsNoComments,
  assertTaskDetailsParentKey,
  assertTaskDetailsSubtasksHeading,
  assertTaskDetailsSummary,
  assertTaskDetailsText,
  assertTaskListRowVisible,
  beginWaitingForIssueDetails,
  beginWaitingForTaskListShellData,
  clickCloseTaskDetails,
  clickTaskListRow,
  gotoTaskManager,
  installTaskViewApiMocks,
  selectTaskListScopeByName,
  TASK_VIEW_E2E_DEMO_PROJECT,
  TASK_VIEW_E2E_ISSUE_KEY,
  TASK_VIEW_E2E_PARENT_KEY,
  TASK_VIEW_E2E_SUBTASK_KEY,
  waitForTaskListProjectsMock,
} from "task-e2e";

const SCOPE_LABEL = "Project";

/** E2E scenario: view a task in Jira. */
export async function viewTask({
  page,
  platformConfig,
  connection,
}: PlatformE2eScenarioContext): Promise<void> {
  await connection.mockConnectionStatus(true);
  await connection.mockSetupComplete();
  await installTaskViewApiMocks(page, platformConfig, {
    delayIssueDetailsMs: 600,
    comments: [],
  });

  const shellDataReady = beginWaitingForTaskListShellData(page, platformConfig);
  await gotoTaskManager(page, platformConfig);
  await shellDataReady;
  await waitForTaskListProjectsMock(page, platformConfig);
  await assertConnectedLabel(page, platformConfig);

  await selectTaskListScopeByName(page, SCOPE_LABEL, TASK_VIEW_E2E_DEMO_PROJECT.name);
  await assertTaskListRowVisible(page, TASK_VIEW_E2E_ISSUE_KEY);

  const issueDetailsReady = beginWaitingForIssueDetails(page, platformConfig);
  await clickTaskListRow(page, TASK_VIEW_E2E_ISSUE_KEY);

  await assertTaskDetailsLoading(page);
  await issueDetailsReady;
  await assertTaskDetailsLoadingHidden(page);
  await assertTaskDetailsDialog(page);

  await assertTaskDetailsParentKey(page, TASK_VIEW_E2E_PARENT_KEY);
  await assertTaskDetailsIssueKey(page, TASK_VIEW_E2E_ISSUE_KEY);
  await assertTaskDetailsSummary(page, "First task");
  await assertTaskDetailsText(page, "Issue description text.");

  await assertTaskDetailsFieldHeading(page, "Type");
  await assertTaskDetailsText(page, "Task");
  await assertTaskDetailsFieldHeading(page, "Priority");
  await assertTaskDetailsFieldHeading(page, "Reporter");
  await assertTaskDetailsText(page, "John Reporter");
  await assertTaskDetailsFieldHeading(page, "Due Date");
  await assertTaskDetailsText(page, "2026-03-31");
  await assertTaskDetailsSubtasksHeading(page, 1);
  await assertTaskDetailsText(page, TASK_VIEW_E2E_SUBTASK_KEY);
  await assertTaskDetailsText(page, "Subtask summary");
  await assertTaskDetailsNoComments(page);

  await assertTaskDetailsEditButton(page);
  await assertTaskDetailsDeleteButton(page);

  await clickCloseTaskDetails(page);
  await assertTaskDetailsHidden(page);
  await assertTaskListRowVisible(page, TASK_VIEW_E2E_ISSUE_KEY);
}
