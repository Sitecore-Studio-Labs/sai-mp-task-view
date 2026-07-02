import type { PlatformE2eScenarioContext } from "task-e2e";
import {
  assertConnectedLabel,
  assertTaskListEmpty,
  assertTaskListError,
  assertTaskListErrorAbsent,
  assertTaskListLoading,
  assertTaskListRowContent,
  assertTaskListScopeOptionsVisible,
  beginWaitingForTaskListShellData,
  gotoTaskManager,
  installTaskListApiMocks,
  selectTaskListScopeByName,
  TASK_LIST_E2E_PROJECTS,
  waitForTaskListProjectsMock,
} from "task-e2e";

const SCOPE_LABEL = "Folder";

/** E2E scenario: list tasks in Wrike. */
export async function listTasks({
  page,
  platformConfig,
  connection,
}: PlatformE2eScenarioContext): Promise<void> {
  await connection.mockConnectionStatus(true);
  await connection.mockSetupComplete();
  await installTaskListApiMocks(page, platformConfig);
  const shellDataReady = beginWaitingForTaskListShellData(page, platformConfig);
  await gotoTaskManager(page, platformConfig);
  await shellDataReady;
  await waitForTaskListProjectsMock(page, platformConfig);
  await assertConnectedLabel(page, platformConfig);

  await assertTaskListScopeOptionsVisible(page, SCOPE_LABEL, [
    TASK_LIST_E2E_PROJECTS.demo.name,
    TASK_LIST_E2E_PROJECTS.empty.name,
    TASK_LIST_E2E_PROJECTS.broken.name,
  ]);

  await selectTaskListScopeByName(page, SCOPE_LABEL, TASK_LIST_E2E_PROJECTS.demo.name);
  await assertTaskListLoading(page);

  await assertTaskListRowContent(
    page,
    "DEMO-1",
    {
      summary: "First task",
      status: "To Do",
      priority: "High",
    },
    platformConfig,
  );
  await assertTaskListRowContent(
    page,
    "DEMO-2",
    {
      summary: "Second task",
      status: "Done",
      priority: "Low",
    },
    platformConfig,
  );

  await selectTaskListScopeByName(page, SCOPE_LABEL, TASK_LIST_E2E_PROJECTS.empty.name);
  await assertTaskListEmpty(page);
  await assertTaskListErrorAbsent(page);

  await selectTaskListScopeByName(page, SCOPE_LABEL, TASK_LIST_E2E_PROJECTS.broken.name);
  await assertTaskListError(page);
}
