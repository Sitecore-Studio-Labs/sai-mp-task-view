import type { PlatformE2eScenarioContext } from "task-e2e";
import {
  assertConnectedLabel,
  assertCreateTaskButton,
  assertCreateTaskButtonDisabled,
  assertCreateTaskButtonEnabled,
  assertCreateTaskForm,
  assertTaskListRowVisible,
  assertTaskListSummaryVisible,
  beginWaitingForTaskCreate,
  beginWaitingForTaskListShellData,
  clickCreateTaskButton,
  fillMinimalCreateForm,
  gotoTaskManager,
  installTaskCreateApiMocks,
  selectTaskListScopeByName,
  submitTaskForm,
  TASK_CREATE_E2E_DEMO_PROJECT,
  TASK_CREATE_E2E_NEW_TASK_SUMMARY,
  waitForTaskListProjectsMock,
} from "task-e2e";

const SCOPE_LABEL = "Project";

/** E2E scenario: create a task in Jira. */
export async function createTask({
  page,
  platformConfig,
  connection,
}: PlatformE2eScenarioContext): Promise<void> {
  const createPermissions = { canCreate: false };

  await connection.mockConnectionStatus(true);
  await connection.mockSetupComplete();
  await installTaskCreateApiMocks(page, platformConfig, { permissions: createPermissions });

  const shellDataReady = beginWaitingForTaskListShellData(page, platformConfig);
  await gotoTaskManager(page, platformConfig);
  await shellDataReady;
  await waitForTaskListProjectsMock(page, platformConfig);
  await assertConnectedLabel(page, platformConfig);

  await selectTaskListScopeByName(page, SCOPE_LABEL, TASK_CREATE_E2E_DEMO_PROJECT.name);
  await assertCreateTaskButtonDisabled(page);

  createPermissions.canCreate = true;
  const shellDataReadyAfterReload = beginWaitingForTaskListShellData(page, platformConfig);
  await page.reload();
  await shellDataReadyAfterReload;
  await waitForTaskListProjectsMock(page, platformConfig);
  await assertConnectedLabel(page, platformConfig);

  await selectTaskListScopeByName(page, SCOPE_LABEL, TASK_CREATE_E2E_DEMO_PROJECT.name);
  await assertCreateTaskButtonEnabled(page);
  await clickCreateTaskButton(page);
  await assertCreateTaskForm(page);

  await fillMinimalCreateForm(page, platformConfig, {
    summary: TASK_CREATE_E2E_NEW_TASK_SUMMARY,
    issueTypeLabel: "Task",
  });

  const createResponse = beginWaitingForTaskCreate(page, platformConfig);
  await submitTaskForm(page);
  const created = await createResponse;

  await assertCreateTaskButton(page);
  await assertTaskListRowVisible(page, created.key);
  await assertTaskListSummaryVisible(page, TASK_CREATE_E2E_NEW_TASK_SUMMARY);
}
