import type { PlatformE2eScenarioContext } from "task-e2e";
import {
  addTaskComment,
  assertConnectedLabel,
  assertReplyingToComment,
  assertTaskDetailsAttachmentFilename,
  assertTaskDetailsAuthorComment,
  assertTaskDetailsCommentsHeading,
  assertTaskDetailsCommentsSection,
  assertTaskDetailsCommentText,
  assertTaskDetailsDeleteButton,
  assertTaskDetailsDialog,
  assertTaskDetailsEditButton,
  assertTaskDetailsFieldHeading,
  assertTaskDetailsHidden,
  assertTaskDetailsLoading,
  assertTaskDetailsLoadingHidden,
  assertTaskDetailsNoComments,
  assertTaskDetailsParentKey,
  assertTaskDetailsSubtasksHeading,
  assertTaskDetailsSummary,
  assertTaskDetailsText,
  assertTaskListRowVisible,
  beginWaitingForCommentPost,
  beginWaitingForIssueDetails,
  beginWaitingForTaskListShellData,
  clickCloseTaskDetails,
  clickReplyOnComment,
  clickTaskListRow,
  E2E_ADD_COMMENT_TEXT,
  E2E_EXISTING_ATTACHMENT_FILENAME,
  E2E_REPLY_COMMENT_TEXT,
  gotoTaskManager,
  installTaskViewApiMocks,
  selectTaskListScopeByName,
  TASK_VIEW_E2E_DEMO_PROJECT,
  TASK_VIEW_E2E_ISSUE_KEY,
  TASK_VIEW_E2E_PARENT_KEY,
  waitForTaskListProjectsMock,
} from "task-e2e";

const SCOPE_LABEL = "Folder";

/** E2E scenario: view a task in Wrike. */
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

  await assertTaskDetailsParentKey(page, TASK_VIEW_E2E_PARENT_KEY, platformConfig);
  await assertTaskDetailsSummary(page, "First task");
  await assertTaskDetailsText(page, "Issue description text.");

  await assertTaskDetailsAttachmentFilename(page, E2E_EXISTING_ATTACHMENT_FILENAME);
  await assertTaskDetailsFieldHeading(page, "Priority");
  await assertTaskDetailsFieldHeading(page, "Reporter");
  await assertTaskDetailsText(page, "John Reporter");
  await assertTaskDetailsFieldHeading(page, "Due Date");
  await assertTaskDetailsSubtasksHeading(page, 1);
  await assertTaskDetailsText(page, "Subtask summary");
  await assertTaskDetailsCommentsSection(page);
  await assertTaskDetailsNoComments(page);

  const commentPost = beginWaitingForCommentPost(page, platformConfig);
  await addTaskComment(page, E2E_ADD_COMMENT_TEXT);
  await commentPost;
  await assertTaskDetailsCommentsHeading(page, 1);
  await assertTaskDetailsCommentText(page, E2E_ADD_COMMENT_TEXT);
  await assertTaskDetailsAuthorComment(page, "Alice");
  await clickReplyOnComment(page, "Alice");
  await assertReplyingToComment(page, "Alice");

  const replyPost = beginWaitingForCommentPost(page, platformConfig);
  await addTaskComment(page, E2E_REPLY_COMMENT_TEXT);
  await replyPost;
  await assertTaskDetailsCommentsHeading(page, 2);
  await assertTaskDetailsCommentText(page, E2E_REPLY_COMMENT_TEXT);

  await assertTaskDetailsEditButton(page);
  await assertTaskDetailsDeleteButton(page);

  await clickCloseTaskDetails(page);
  await assertTaskDetailsHidden(page);
  await assertTaskListRowVisible(page, TASK_VIEW_E2E_ISSUE_KEY);
}
