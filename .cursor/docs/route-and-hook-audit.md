# Route & Hook Audit

Snapshot of which API routes and React hooks are actively used by the frontend,
which are only referenced by tests, and which are dead code.

---

## 1. Platform Routes (`/api/platform/*`)

All platform routes are actively used by the frontend. None have test coverage yet.

| Route                                      | Methods            | Frontend Caller(s)                                                        |
| ------------------------------------------ | ------------------ | ------------------------------------------------------------------------- |
| `/api/platform/projects`                   | GET                | `useProjects`                                                             |
| `/api/platform/tasks`                      | GET, POST          | `useProjectTasks`, `useParentTasks` (GET); `useCreateTask` (POST)         |
| `/api/platform/tasks/[taskId]`             | GET, PATCH, DELETE | `useTaskDetails` (GET); `useUpdateTask` (PATCH); `useDeleteTask` (DELETE) |
| `/api/platform/tasks/[taskId]/transitions` | GET, POST          | `useTaskTransitions` (GET); `useTaskStatusChange` (POST)                  |
| `/api/platform/comments`                   | GET, POST          | `useTaskComments` (GET); `useAddTaskComment` (POST)                       |
| `/api/platform/current-user`               | GET                | `useCurrentUser`                                                          |
| `/api/platform/assignees`                  | GET                | `useAssignees`                                                            |
| `/api/platform/priorities`                 | GET                | `usePriorities`                                                           |
| `/api/platform/statuses`                   | GET                | `useProjectStatuses`                                                      |
| `/api/platform/issue-types`                | GET                | `useIssueTypes`                                                           |
| `/api/platform/attachments`                | POST               | `CreateTaskProvider`, `EditTaskProvider`                                  |
| `/api/platform/attachments/[attachmentId]` | GET, DELETE        | `useDeleteAttachment` (DELETE); `EditTaskView` (GET via link)             |

---

## 2. Jira Routes (`/api/jira/*`) — Still in Use

These routes are still actively called by frontend hooks or components.

| Route                       | Methods | Frontend Caller(s)                                    | Tests |
| --------------------------- | ------- | ----------------------------------------------------- | ----- |
| `/api/jira/sites`           | GET     | `useJiraSites`                                        | —     |
| `/api/jira/select-site`     | POST    | `useJiraSelectSite`                                   | —     |
| `/api/jira/select-project`  | POST    | `useJiraSelectProject`                                | —     |
| `/api/jira/permissions`     | GET     | `usePermission` (from `useIssuePermission.ts`)        | —     |
| `/api/jira/attachment/[id]` | GET     | `AdfRenderer` (inline images), `EditTaskView` (links) | —     |

---

## 3. Jira Routes — Tests Only (no frontend caller)

These routes have no active frontend caller but are imported by test files.

| Route                               | Methods   | Test File(s)                                          |
| ----------------------------------- | --------- | ----------------------------------------------------- |
| `/api/jira/issues`                  | GET, POST | `jira-issues-get.spec.ts`, `jira-issues-post.spec.ts` |
| `/api/jira/projects`                | GET       | `jira-projects.spec.ts`                               |
| `/api/jira/comments`                | GET, POST | `auth-negative.spec.ts`                               |
| `/api/jira/issues/[id]/transitions` | GET, POST | `auth-negative.spec.ts`                               |

---

## 4. Jira Routes — Dead Code (no frontend caller, no tests)

These routes have no frontend caller and no test coverage. Safe to delete.

| Route                             | Methods            | Notes                                      |
| --------------------------------- | ------------------ | ------------------------------------------ |
| `/api/jira/issue-types`           | GET                | Replaced by `/api/platform/issue-types`    |
| `/api/jira/current-user`          | GET                | Replaced by `/api/platform/current-user`   |
| `/api/jira/priorities`            | GET                | Replaced by `/api/platform/priorities`     |
| `/api/jira/project-priorities`    | GET                | Replaced by `/api/platform/priorities`     |
| `/api/jira/assignees`             | GET                | Replaced by `/api/platform/assignees`      |
| `/api/jira/statuses/[projectKey]` | GET                | Replaced by `/api/platform/statuses`       |
| `/api/jira/sync-signal`           | GET                | No caller found                            |
| `/api/jira/webhooks`              | POST               | External/admin use only; no in-app caller  |
| `/api/jira/comments/[commentId]`  | GET                | No frontend caller                         |
| `/api/jira/issues/[id]`           | GET, PATCH, DELETE | Replaced by `/api/platform/tasks/[taskId]` |

---

## 5. Auth Routes (`/api/auth/jira/*`)

All auth routes are still actively used.

| Route                       | Methods | Caller                                   | Tests                       |
| --------------------------- | ------- | ---------------------------------------- | --------------------------- |
| `/api/auth/jira/status`     | GET     | `useJiraConnectionStatus`                | `auth-jira-status.spec.ts`  |
| `/api/auth/jira/refresh`    | POST    | `axiosClient.ts` (interceptor)           | `auth-jira-refresh.spec.ts` |
| `/api/auth/jira/connect`    | GET     | `ConnectJiraButton` (browser navigation) | —                           |
| `/api/auth/jira/disconnect` | POST    | `useDisconnectJira`                      | —                           |
| `/api/auth/jira/callback`   | GET     | OAuth redirect target (external)         | —                           |

---

## 6. Platform Hooks — All Active

Every platform hook is imported by at least one component or provider.

| Hook                  | Endpoint                                   | Imported By                                                                    |
| --------------------- | ------------------------------------------ | ------------------------------------------------------------------------------ |
| `useProjects`         | `/api/platform/projects`                   | `TaskManagerProvider`                                                          |
| `useProjectTasks`     | `/api/platform/tasks`                      | `TaskManagerProvider`                                                          |
| `useTaskDetails`      | `/api/platform/tasks/[taskId]`             | `TaskDetailsContainer`                                                         |
| `useTaskComments`     | `/api/platform/comments`                   | `TaskComments`                                                                 |
| `useAddTaskComment`   | `/api/platform/comments`                   | `AddCommentInput`                                                              |
| `useDeleteTask`       | `/api/platform/tasks/[taskId]`             | `DeleteTaskButton`                                                             |
| `useTaskTransitions`  | `/api/platform/tasks/[taskId]/transitions` | `TaskDetails`                                                                  |
| `useTaskStatusChange` | `/api/platform/tasks/[taskId]/transitions` | `TaskDetails`                                                                  |
| `useCurrentUser`      | `/api/platform/current-user`               | `TaskListFilters`, `AddCommentInput`, `CreateTaskProvider`, `EditTaskProvider` |
| `useAssignees`        | `/api/platform/assignees`                  | `TaskListFilters`, `CreateTaskProvider`, `EditTaskProvider`                    |
| `usePriorities`       | `/api/platform/priorities`                 | `TaskListFilters`, `CreateTaskProvider`, `EditTaskProvider`                    |
| `useProjectStatuses`  | `/api/platform/statuses`                   | `TaskListFilters`                                                              |
| `useIssueTypes`       | `/api/platform/issue-types`                | `WorkBreakdownPreviewView`, `CreateTaskProvider`, `EditTaskProvider`           |
| `useCreateTask`       | `/api/platform/tasks`                      | `CreateTaskProvider`                                                           |
| `useUpdateTask`       | `/api/platform/tasks/[taskId]`             | `EditTaskProvider`                                                             |
| `useParentTasks`      | `/api/platform/tasks`                      | `CreateTaskProvider`, `EditTaskProvider`                                       |
| `useDeleteAttachment` | `/api/platform/attachments/[id]`           | `EditTaskView`                                                                 |

---

## 7. Old Jira Hooks — Still Active

These hooks still call `/api/jira/*` and are imported by frontend code.

| Hook                      | Endpoint                    | Imported By                                                                                                                                          |
| ------------------------- | --------------------------- | ---------------------------------------------------------------------------------------------------------------------------------------------------- |
| `useJiraConnectionStatus` | `/api/auth/jira/status`     | `TaskManagerProvider`, `ConnectionStatusBar`, `ConnectionSite`, `ProjectPickerSection`, `ConnectionsList`, `TaskListSection`, `useOAuthPopupHandler` |
| `useDisconnectJira`       | `/api/auth/jira/disconnect` | `ConnectionStatusBar`                                                                                                                                |
| `useJiraSites`            | `/api/jira/sites`           | `TaskManagerProvider`                                                                                                                                |
| `useJiraSelectSite`       | `/api/jira/select-site`     | `ConnectionSite`                                                                                                                                     |
| `useJiraSelectProject`    | `/api/jira/select-project`  | `ProjectPickerSection`                                                                                                                               |
| `usePermission`           | `/api/jira/permissions`     | `TaskManagerProvider`, `EditTaskButton`, `DeleteTaskButton`                                                                                          |

---

## 8. Old Jira Hooks — Dead Code (no importer)

These hooks have no active importer and can be deleted.

| Hook                      | File                         | Former Endpoint                     |
| ------------------------- | ---------------------------- | ----------------------------------- |
| `useJiraProjects`         | `useJiraProjects.ts`         | `/api/jira/projects`                |
| `useIssueComments`        | `useIssueComments.ts`        | `/api/jira/comments`                |
| `useAddComment`           | `useAddComment.ts`           | `/api/jira/comments`                |
| `useIssueDetails`         | `useIssueDetails.ts`         | `/api/jira/issues/[id]`             |
| `useIssueStatusChange`    | `useIssueStatusChange.ts`    | `/api/jira/issues/[id]/transitions` |
| `useIssueTransitions`     | `useIssueTransitions.ts`     | `/api/jira/issues/[id]/transitions` |
| `useDeleteIssue`          | `useDeleteIssue.ts`          | `/api/jira/issues/[id]`             |
| `useProjectIssues`        | `useProjectIssues.ts`        | `/api/jira/issues`                  |
| `useProjectIssueStatuses` | `useProjectIssueStatuses.ts` | `/api/jira/statuses/[key]`          |
| `useOpenJiraAttachment`   | `useOpenJiraAttachment.ts`   | `/api/jira/attachment/[id]`         |
| `useJiraWebhookSync`      | `useJiraWebhookSync.ts`      | Supabase Realtime (no API)          |
| `useDeleteJiraAttachment` | `useDeleteJiraAttachment.ts` | `/api/jira/attachment/[id]`         |
