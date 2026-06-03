import type {
  AddCommentPayload,
  AssigneeOption,
  CreateTaskPayload,
  CreateTaskResult,
  IssueTypeOption,
  PlatformComment,
  PlatformCommentsResponse,
  PlatformProject,
  PlatformTask,
  PlatformTasksPageResponse,
  PlatformTransition,
  PlatformUser,
  PriorityOption,
} from "@mp/task-core";

export const FIXTURE_USER: PlatformUser = {
  accountId: "user-1",
  displayName: "Test User",
  avatarUrls: { "48x48": "https://example.com/avatar.png" },
};

export const FIXTURE_PROJECT: PlatformProject = {
  id: "proj-1",
  key: "TEST",
  name: "Test Project",
};

export const FIXTURE_ISSUE_TYPE: IssueTypeOption = {
  id: "issuetype-1",
  name: "Story",
  iconUrl: "https://example.com/story.png",
};

export const FIXTURE_PRIORITY: PriorityOption = {
  id: "priority-1",
  name: "Medium",
  iconUrl: "https://example.com/medium.png",
};

export const FIXTURE_ASSIGNEE: AssigneeOption = {
  id: "user-1",
  displayName: "Test User",
  avatarUrl: "https://example.com/avatar.png",
};

export const FIXTURE_TASK: PlatformTask = {
  id: "task-1",
  key: "TEST-1",
  fields: {
    summary: "Test task",
    status: { id: "status-1", name: "To Do", statusCategory: { key: "new", name: "To Do" } },
    project: { id: "proj-1", key: "TEST", name: "Test Project" },
    issuetype: { id: "issuetype-1", name: "Story" },
    priority: { id: "priority-1", name: "Medium" },
    assignee: FIXTURE_USER,
  },
};

export const FIXTURE_COMMENT: PlatformComment = {
  id: "comment-1",
  author: FIXTURE_USER,
  body: "Test comment",
  created: "2024-01-01T00:00:00.000Z",
  updated: "2024-01-01T00:00:00.000Z",
};

export const FIXTURE_REPLY_COMMENT: PlatformComment = {
  id: "comment-2",
  author: FIXTURE_USER,
  body: "@Test User Thanks!",
  created: "2024-01-02T00:00:00.000Z",
  updated: "2024-01-02T00:00:00.000Z",
  parentCommentId: "comment-1",
};

export const FIXTURE_TRANSITION: PlatformTransition = {
  id: "transition-1",
  name: "Start Progress",
  to: { id: "status-2", name: "In Progress", statusCategory: { key: "indeterminate" } },
};

export const FIXTURE_CREATE_PAYLOAD: CreateTaskPayload = {
  projectId: "proj-1",
  issueTypeId: "issuetype-1",
  summary: "New test task",
  description: "Test description",
  priority: "priority-1",
  assignee: "user-1",
};

export const FIXTURE_CREATE_RESULT: CreateTaskResult = {
  id: "task-new",
  key: "TEST-2",
  summary: "New test task",
  projectId: "proj-1",
  projectKey: "TEST",
};

export const FIXTURE_TASKS_PAGE: PlatformTasksPageResponse = {
  issues: [FIXTURE_TASK],
  isLast: true,
};

export const FIXTURE_COMMENTS_RESPONSE: PlatformCommentsResponse = {
  startAt: 0,
  maxResults: 50,
  total: 2,
  comments: [FIXTURE_COMMENT, FIXTURE_REPLY_COMMENT],
};

export const FIXTURE_ADD_COMMENT_PAYLOAD: AddCommentPayload = {
  issueIdOrKey: "TEST-1",
  text: "New comment text",
};

export const FIXTURE_ADD_COMMENT_REPLY_PAYLOAD: AddCommentPayload = {
  issueIdOrKey: "TEST-1",
  text: "Thanks for the update!",
  replyToCommentId: "comment-1",
  replyToAuthorId: "user-2",
  replyToAuthorDisplayName: "Other User",
};
