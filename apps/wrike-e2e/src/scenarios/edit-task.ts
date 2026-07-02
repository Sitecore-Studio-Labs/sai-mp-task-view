import type { PlatformE2eScenarioContext } from "task-e2e";
import {
  assertConnectedLabel,
  assertEditTaskForm,
  assertEditTaskFormTitle,
  assertTaskAttachmentPendingFilename,
  assertTaskAttachmentsField,
  assertTaskDetailsAttachmentFilename,
  assertTaskDetailsDialog,
  assertTaskDetailsEditButtonDisabled,
  assertTaskDetailsEditButtonEnabled,
  assertTaskDetailsStatus,
  assertTaskDetailsStatusSelect,
  assertTaskDetailsSummary,
  assertTaskFormExistingAttachment,
  assertTaskFormExistingAttachmentHidden,
  assertTaskListRowContent,
  attachTaskFiles,
  beginWaitingForAttachmentDelete,
  beginWaitingForAttachmentUpload,
  beginWaitingForIssueDetails,
  beginWaitingForIssueUpdate,
  beginWaitingForStatusTransition,
  beginWaitingForTaskListShellData,
  changeTaskStatus,
  clickDeleteTaskAttachment,
  clickEditTask,
  clickTaskListRow,
  E2E_EXISTING_ATTACHMENT_FILENAME,
  E2E_NEW_ATTACHMENT_FILENAME,
  fillTaskSummary,
  gotoTaskManager,
  installTaskEditApiMocks,
  selectTaskListScopeByName,
  submitTaskForm,
  TASK_EDIT_E2E_DEMO_PROJECT,
  TASK_EDIT_E2E_INITIAL_STATUS,
  TASK_EDIT_E2E_INITIAL_SUMMARY,
  TASK_EDIT_E2E_ISSUE_KEY,
  TASK_EDIT_E2E_TRANSITION_STATUS,
  TASK_EDIT_E2E_UPDATED_SUMMARY,
  waitForTaskListProjectsMock,
} from "task-e2e";

const SCOPE_LABEL = "Folder";

/** E2E scenario: edit a task in Wrike. */
export async function editTask({
  page,
  platformConfig,
  connection,
}: PlatformE2eScenarioContext): Promise<void> {
  const editPermissions = { canEdit: false };

  await connection.mockConnectionStatus(true);
  await connection.mockSetupComplete();
  await installTaskEditApiMocks(page, platformConfig, { permissions: editPermissions });

  const shellDataReady = beginWaitingForTaskListShellData(page, platformConfig);
  await gotoTaskManager(page, platformConfig);
  await shellDataReady;
  await waitForTaskListProjectsMock(page, platformConfig);
  await assertConnectedLabel(page, platformConfig);

  await selectTaskListScopeByName(page, SCOPE_LABEL, TASK_EDIT_E2E_DEMO_PROJECT.name);
  await assertTaskListRowContent(page, TASK_EDIT_E2E_ISSUE_KEY, {
    summary: TASK_EDIT_E2E_INITIAL_SUMMARY,
    status: TASK_EDIT_E2E_INITIAL_STATUS,
    priority: "High",
  });

  const issueDetailsReady = beginWaitingForIssueDetails(
    page,
    platformConfig,
    TASK_EDIT_E2E_ISSUE_KEY,
  );
  await clickTaskListRow(page, TASK_EDIT_E2E_ISSUE_KEY);
  await issueDetailsReady;
  await assertTaskDetailsDialog(page);
  await assertTaskDetailsSummary(page, TASK_EDIT_E2E_INITIAL_SUMMARY);
  await assertTaskDetailsEditButtonDisabled(page);

  editPermissions.canEdit = true;
  const shellDataReadyAfterReload = beginWaitingForTaskListShellData(page, platformConfig);
  await page.reload();
  await shellDataReadyAfterReload;
  await waitForTaskListProjectsMock(page, platformConfig);
  await assertConnectedLabel(page, platformConfig);

  await selectTaskListScopeByName(page, SCOPE_LABEL, TASK_EDIT_E2E_DEMO_PROJECT.name);

  const issueDetailsReadyAgain = beginWaitingForIssueDetails(
    page,
    platformConfig,
    TASK_EDIT_E2E_ISSUE_KEY,
  );
  await clickTaskListRow(page, TASK_EDIT_E2E_ISSUE_KEY);
  await issueDetailsReadyAgain;
  await assertTaskDetailsDialog(page);
  await assertTaskDetailsSummary(page, TASK_EDIT_E2E_INITIAL_SUMMARY);
  await assertTaskDetailsEditButtonEnabled(page);

  await assertTaskDetailsStatusSelect(page);
  await assertTaskDetailsStatus(page, TASK_EDIT_E2E_INITIAL_STATUS);

  const statusTransition = beginWaitingForStatusTransition(page, platformConfig);
  await changeTaskStatus(page, TASK_EDIT_E2E_TRANSITION_STATUS);
  await statusTransition;
  await assertTaskDetailsStatus(page, TASK_EDIT_E2E_TRANSITION_STATUS);
  await assertTaskListRowContent(page, TASK_EDIT_E2E_ISSUE_KEY, {
    summary: TASK_EDIT_E2E_INITIAL_SUMMARY,
    status: TASK_EDIT_E2E_TRANSITION_STATUS,
    priority: "High",
  });

  await clickEditTask(page);
  await assertEditTaskForm(page);
  await assertEditTaskFormTitle(page, "Edit Wrike Task");

  await assertTaskAttachmentsField(page);
  await assertTaskFormExistingAttachment(page, E2E_EXISTING_ATTACHMENT_FILENAME);

  const attachmentDelete = beginWaitingForAttachmentDelete(page, platformConfig);
  await clickDeleteTaskAttachment(page, E2E_EXISTING_ATTACHMENT_FILENAME);
  await attachmentDelete;
  await assertTaskFormExistingAttachmentHidden(page, E2E_EXISTING_ATTACHMENT_FILENAME);

  await attachTaskFiles(page, E2E_NEW_ATTACHMENT_FILENAME);
  await assertTaskAttachmentPendingFilename(page, E2E_NEW_ATTACHMENT_FILENAME);

  await fillTaskSummary(page, TASK_EDIT_E2E_UPDATED_SUMMARY);
  const updateResponse = beginWaitingForIssueUpdate(page, platformConfig, TASK_EDIT_E2E_ISSUE_KEY);
  const attachmentUpload = beginWaitingForAttachmentUpload(
    page,
    platformConfig,
    TASK_EDIT_E2E_ISSUE_KEY,
  );
  await submitTaskForm(page);
  await updateResponse;
  await attachmentUpload;
  await assertTaskDetailsAttachmentFilename(page, E2E_NEW_ATTACHMENT_FILENAME);

  await assertTaskDetailsDialog(page);
  await assertTaskDetailsSummary(page, TASK_EDIT_E2E_UPDATED_SUMMARY);
}
