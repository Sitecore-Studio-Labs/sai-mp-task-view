import type { Page } from "@playwright/test";

import type { PlatformE2eConfig } from "../config/platform-e2e-config";
import { APP_READY_TIMEOUT } from "../constants/timeouts";
import { buildMockRichTextBody } from "./mock-rich-text";
import {
  E2E_SAMPLE_EXISTING_ATTACHMENT,
  installTaskAttachmentApiMocks,
  type MockTaskAttachment,
} from "./task-attachment-mock";
import { TASK_CREATE_E2E_ISSUE_TYPES } from "./task-create-mock";
import {
  apiPrefixPattern,
  installTaskListApiMocks,
  isIssueAttachmentsUploadPath,
  isIssueTransitionsPath,
  type MockTaskListIssue,
  TASK_LIST_E2E_PROJECTS,
  type TaskListMockOptions,
} from "./task-list-mock";
import {
  TASK_VIEW_E2E_ISSUE_KEY,
  TASK_VIEW_E2E_PARENT_KEY,
  TASK_VIEW_E2E_PARENT_SUMMARY,
  TASK_VIEW_E2E_SUBTASK_KEY,
} from "./task-view-mock";

export {
  beginWaitingForAttachmentDelete,
  beginWaitingForAttachmentUpload,
  E2E_EXISTING_ATTACHMENT_FILENAME,
  E2E_EXISTING_ATTACHMENT_ID,
  E2E_NEW_ATTACHMENT_FILENAME,
  E2E_SAMPLE_EXISTING_ATTACHMENT,
} from "./task-attachment-mock";
export {
  beginWaitingForStatusTransition,
  TASK_VIEW_E2E_INITIAL_STATUS as TASK_EDIT_E2E_INITIAL_STATUS,
  TASK_VIEW_E2E_TRANSITION_STATUS as TASK_EDIT_E2E_TRANSITION_STATUS,
} from "./task-view-mock";

export const TASK_EDIT_E2E_ISSUE_KEY = TASK_VIEW_E2E_ISSUE_KEY;
export const TASK_EDIT_E2E_DEMO_PROJECT = TASK_LIST_E2E_PROJECTS.demo;
export const TASK_EDIT_E2E_INITIAL_SUMMARY = "Initial issue summary";
export const TASK_EDIT_E2E_UPDATED_SUMMARY = "Updated issue summary";

const statusToDo = { id: "st-todo", name: "To Do", statusCategory: { key: "new" } };
const statusInProgress = {
  id: "st-in-progress",
  name: "In Progress",
  statusCategory: { key: "indeterminate" },
};
const statusDone = { id: "st-done", name: "Done", statusCategory: { key: "done" } };

export type TaskEditPermissionState = {
  canEdit: boolean;
};

export type TaskEditMockOptions = TaskListMockOptions & {
  /** Mutable permission flags used by the permissions API mock. */
  permissions?: TaskEditPermissionState;
  issueTypes?: Array<{ id: string; name: string; iconUrl?: string }>;
};

type UpdateTaskRequestPayload = {
  summary?: string;
  description?: string;
  priority?: string;
  parentIssueKey?: string;
  assignee?: string;
  dueDate?: string;
};

function issueKeyFromPath(pathname: string, platformName: string): string | null {
  const match = pathname.match(new RegExp(`/api/${platformName}/issues/([^/]+)$`));
  return match?.[1] ?? null;
}

function buildInitialListIssue(status: typeof statusToDo = statusToDo): MockTaskListIssue {
  return {
    id: "1",
    key: TASK_EDIT_E2E_ISSUE_KEY,
    fields: {
      summary: TASK_EDIT_E2E_INITIAL_SUMMARY,
      status,
      priority: { id: "pri-high", name: "High" },
      assignee: {
        accountId: "acct-alice",
        displayName: "Alice",
        avatarUrls: { "48x48": "https://example.test/avatar-alice.png" },
      },
    },
  };
}

function buildEditIssueDetails(
  config: PlatformE2eConfig,
  summary: string,
  status: typeof statusToDo = statusToDo,
  attachments: MockTaskAttachment[] = [],
) {
  return {
    id: "1",
    key: TASK_EDIT_E2E_ISSUE_KEY,
    fields: {
      parent: {
        id: "parent-1",
        key: TASK_VIEW_E2E_PARENT_KEY,
        summary: TASK_VIEW_E2E_PARENT_SUMMARY,
      },
      summary,
      description: buildMockRichTextBody(config),
      status,
      assignee: {
        accountId: "acct-alice",
        displayName: "Alice",
        avatarUrls: { "48x48": "https://example.test/avatar-alice.png" },
      },
      reporter: {
        accountId: "acct-reporter",
        displayName: "John Reporter",
        avatarUrls: { "48x48": "https://example.test/avatar-reporter.png" },
      },
      duedate: "2026-03-31",
      issuetype: { id: "it-task", name: "Task" },
      priority: { id: "pri-high", name: "High" },
      subtasks: [
        {
          id: "sub-1",
          key: TASK_VIEW_E2E_SUBTASK_KEY,
          fields: { summary: "Subtask summary", status: statusDone },
        },
      ],
      attachment: attachments.map(({ id, filename }) => ({ id, filename })),
    },
  };
}

function filterIssuesForList(issues: MockTaskListIssue[], url: URL): MockTaskListIssue[] {
  const status = url.searchParams.getAll("status");
  const priority = url.searchParams.getAll("priority");
  const assignee = url.searchParams.getAll("assignee");

  let filtered = [...issues];
  if (status.length > 0) {
    filtered = filtered.filter((issue) => status.includes(issue.fields.status.id));
  }
  if (priority.length > 0) {
    filtered = filtered.filter(
      (issue) => issue.fields.priority && priority.includes(issue.fields.priority.id),
    );
  }
  if (assignee.length > 0) {
    filtered = filtered.filter((issue) => {
      const accountId = issue.fields.assignee?.accountId ?? "unassigned";
      return assignee.includes(accountId);
    });
  }

  const seen = new Set<string>();
  return filtered.filter((issue) => {
    if (seen.has(issue.key)) return false;
    seen.add(issue.key);
    return true;
  });
}

/** Register immediately before saving the edit-task form. */
export function beginWaitingForIssueUpdate(
  page: Page,
  config: PlatformE2eConfig,
  issueKey: string = TASK_EDIT_E2E_ISSUE_KEY,
) {
  const issuePath = `/api/${config.platformName}/issues/${issueKey}`;
  return page.waitForResponse(
    (response) =>
      response.url().includes(issuePath) &&
      response.request().method() === "PATCH" &&
      response.ok(),
    { timeout: APP_READY_TIMEOUT },
  );
}

/**
 * Installs list mocks with mutable issue summary, permission-aware EDIT_ISSUES checks,
 * issue detail GET/PATCH routes, and metadata stubs for edit-task E2E.
 */
export async function installTaskEditApiMocks(
  page: Page,
  config: PlatformE2eConfig,
  options: TaskEditMockOptions = {},
): Promise<void> {
  const permissions: TaskEditPermissionState = options.permissions ?? { canEdit: true };
  const issueTypes = options.issueTypes ?? [...TASK_CREATE_E2E_ISSUE_TYPES];
  let issueStatus = statusToDo;
  const liveAttachments: MockTaskAttachment[] = config.hasAttachments
    ? [{ ...E2E_SAMPLE_EXISTING_ATTACHMENT }]
    : [];
  const issueState = {
    summary: TASK_EDIT_E2E_INITIAL_SUMMARY,
    issues: [buildInitialListIssue(issueStatus)],
  };

  const viewTransitions = [
    {
      id: "tr-1",
      name: "Start Progress",
      to: statusInProgress,
    },
  ];

  await installTaskListApiMocks(page, config, {
    ...options,
    projects: [{ ...TASK_LIST_E2E_PROJECTS.demo }],
    issues: issueState.issues,
    issuesLoadDelayMs: 0,
  });

  if (config.hasIssueTypes) {
    await page.route(apiPrefixPattern(config, "/issue-types"), async (route) => {
      await route.fulfill({
        status: 200,
        contentType: "application/json",
        body: JSON.stringify(issueTypes),
      });
    });
  }

  await page.unroute(apiPrefixPattern(config, "/permissions")).catch(() => undefined);
  await page.route(apiPrefixPattern(config, "/permissions"), async (route) => {
    const url = new URL(route.request().url());
    const permission = url.searchParams.get("permission") ?? "";
    let hasPermission = true;

    if (permission === "EDIT_ISSUES") {
      hasPermission = permissions.canEdit;
    }

    await route.fulfill({
      status: 200,
      contentType: "application/json",
      body: JSON.stringify({ hasPermission }),
    });
  });

  if (config.hasStatusTransitions) {
    await page
      .unroute(apiPrefixPattern(config, `/issues/${TASK_EDIT_E2E_ISSUE_KEY}/transitions`))
      .catch(() => undefined);
  }

  await page.unroute(apiPrefixPattern(config, "/issues")).catch(() => undefined);
  await page.route(apiPrefixPattern(config, "/issues"), async (route) => {
    const url = new URL(route.request().url());
    if (isIssueTransitionsPath(url.pathname, config.platformName)) {
      await route.continue();
      return;
    }
    if (isIssueAttachmentsUploadPath(url.pathname, config.platformName)) {
      await route.continue();
      return;
    }

    const issueKey = issueKeyFromPath(url.pathname, config.platformName);

    if (route.request().method() === "PATCH" && issueKey === TASK_EDIT_E2E_ISSUE_KEY) {
      const body = (await route.request().postDataJSON()) as UpdateTaskRequestPayload;
      if (typeof body.summary === "string") {
        issueState.summary = body.summary;
        const issue = issueState.issues.find((item) => item.key === issueKey);
        if (issue) {
          issue.fields.summary = body.summary;
        }
      }

      await route.fulfill({
        status: 200,
        contentType: "application/json",
        body: JSON.stringify(
          buildEditIssueDetails(config, issueState.summary, issueStatus, liveAttachments),
        ),
      });
      return;
    }

    if (route.request().method() === "GET" && issueKey === TASK_EDIT_E2E_ISSUE_KEY) {
      await route.fulfill({
        status: 200,
        contentType: "application/json",
        body: JSON.stringify(
          buildEditIssueDetails(config, issueState.summary, issueStatus, liveAttachments),
        ),
      });
      return;
    }

    if (route.request().method() === "GET" && !issueKey) {
      const projectKey = url.searchParams.get("projectKey") ?? "";
      if (projectKey !== TASK_LIST_E2E_PROJECTS.demo.key) {
        await route.fulfill({
          status: 200,
          contentType: "application/json",
          body: JSON.stringify({ issues: [], nextPageToken: null, isLast: true }),
        });
        return;
      }

      const filtered = filterIssuesForList(issueState.issues, url);
      await route.fulfill({
        status: 200,
        contentType: "application/json",
        body: JSON.stringify({ issues: filtered, nextPageToken: null, isLast: true }),
      });
      return;
    }

    await route.continue();
  });

  if (config.hasStatusTransitions) {
    await page.route(
      apiPrefixPattern(config, `/issues/${TASK_EDIT_E2E_ISSUE_KEY}/transitions`),
      async (route) => {
        if (route.request().method() === "POST") {
          const payload = route.request().postDataJSON() as { transitionId?: string };
          const transition = viewTransitions.find((item) => item.id === payload.transitionId);
          // Workflow-scoped pickers (e.g. Wrike) POST the target status id, not a transition id.
          const nextStatus =
            transition?.to ??
            [statusToDo, statusInProgress, statusDone].find(
              (status) => status.id === payload.transitionId,
            );
          if (nextStatus) {
            issueStatus = nextStatus;
            const issue = issueState.issues.find((item) => item.key === TASK_EDIT_E2E_ISSUE_KEY);
            if (issue) {
              issue.fields.status = issueStatus;
            }
          }

          await route.fulfill({
            status: 200,
            contentType: "application/json",
            body: JSON.stringify({
              success: true,
              message: "Issue status updated successfully",
            }),
          });
          return;
        }

        await route.fulfill({
          status: 200,
          contentType: "application/json",
          body: JSON.stringify({
            transitions: issueStatus.id === statusToDo.id ? viewTransitions : [],
          }),
        });
      },
    );
  }

  if (config.hasComments) {
    await page.route(apiPrefixPattern(config, "/comments"), async (route) => {
      const requestUrl = new URL(route.request().url());
      const issueIdOrKey = requestUrl.searchParams.get("issueIdOrKey");
      if (issueIdOrKey !== TASK_EDIT_E2E_ISSUE_KEY) {
        await route.continue();
        return;
      }

      await route.fulfill({
        status: 200,
        contentType: "application/json",
        body: JSON.stringify({
          startAt: 0,
          maxResults: 0,
          total: 0,
          comments: [],
        }),
      });
    });
  }

  if (config.hasAttachments) {
    await installTaskAttachmentApiMocks(page, config, liveAttachments);
  }
}
