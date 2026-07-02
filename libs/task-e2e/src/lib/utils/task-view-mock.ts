import type { Page } from "@playwright/test";

import type { PlatformE2eConfig } from "../config/platform-e2e-config";
import { APP_READY_TIMEOUT } from "../constants/timeouts";
import {
  buildMockCommentBody,
  buildMockRichTextBody,
  E2E_ADD_COMMENT_TEXT,
  E2E_REPLY_COMMENT_TEXT,
  MOCK_COMMENT_BODY_ADF,
  MOCK_COMMENT_TEXT,
} from "./mock-rich-text";
import {
  E2E_SAMPLE_EXISTING_ATTACHMENT,
  installTaskAttachmentApiMocks,
  type MockTaskAttachment,
} from "./task-attachment-mock";
import {
  apiPattern,
  apiPrefixPattern,
  installTaskListApiMocks,
  isIssueDetailPath,
  TASK_LIST_E2E_PROJECTS,
  type TaskListMockOptions,
} from "./task-list-mock";

export {
  E2E_EXISTING_ATTACHMENT_FILENAME,
  E2E_NEW_ATTACHMENT_FILENAME,
  E2E_SAMPLE_EXISTING_ATTACHMENT,
} from "./task-attachment-mock";

export const TASK_VIEW_E2E_ISSUE_KEY = "DEMO-1";
export const TASK_VIEW_E2E_PARENT_KEY = "DEMO-0";
export const TASK_VIEW_E2E_PARENT_SUMMARY = "Parent issue";
export const TASK_VIEW_E2E_SUBTASK_KEY = "DEMO-1-1";
export const TASK_VIEW_E2E_INITIAL_STATUS = "To Do";
export const TASK_VIEW_E2E_TRANSITION_STATUS = "In Progress";

const statusToDo = {
  id: "st-todo",
  name: TASK_VIEW_E2E_INITIAL_STATUS,
  statusCategory: { key: "new" },
};
const statusInProgress = {
  id: "st-in-progress",
  name: TASK_VIEW_E2E_TRANSITION_STATUS,
  statusCategory: { key: "indeterminate" },
};
const statusDone = { id: "st-done", name: "Done", statusCategory: { key: "done" } };

export type TaskViewMockComment = {
  id: string;
  body:
    | string
    | {
        type: string;
        version: number;
        content: Array<{
          type: string;
          content: Array<{ type: string; text: string }>;
        }>;
      };
  author: { accountId: string; displayName: string; avatarUrls?: Record<string, string> };
  created: string;
  updated: string;
  parentCommentId?: string;
};

export { E2E_ADD_COMMENT_TEXT, E2E_REPLY_COMMENT_TEXT };

const E2E_COMMENT_AUTHOR = {
  accountId: "acct-alice",
  displayName: "Alice",
  avatarUrls: { "48x48": "https://example.test/avatar-alice.png" },
};

export const TASK_VIEW_E2E_SAMPLE_COMMENT: TaskViewMockComment = {
  id: "comment-1",
  body: MOCK_COMMENT_BODY_ADF,
  author: {
    accountId: "acct-alice",
    displayName: "Alice",
    avatarUrls: { "48x48": "https://example.test/avatar-alice.png" },
  },
  created: "2026-03-26T10:00:00.000Z",
  updated: "2026-03-26T10:00:00.000Z",
};

export type TaskViewMockOptions = TaskListMockOptions & {
  comments?: TaskViewMockComment[];
  attachments?: MockTaskAttachment[];
  /** Simulates a brief loading state on the issue-details response. */
  delayIssueDetailsMs?: number;
};

function normalizeMockComments(
  config: PlatformE2eConfig,
  comments: TaskViewMockComment[],
): TaskViewMockComment[] {
  if (config.richTextFormat === "adf") {
    return comments;
  }

  return comments.map((comment) => ({
    ...comment,
    body: typeof comment.body === "string" ? comment.body : MOCK_COMMENT_TEXT,
  }));
}

function buildViewIssueDetails(
  config: PlatformE2eConfig,
  status: typeof statusToDo = statusToDo,
  attachments: MockTaskAttachment[] = [],
) {
  return {
    id: "1",
    key: TASK_VIEW_E2E_ISSUE_KEY,
    fields: {
      parent: {
        id: "parent-1",
        key: TASK_VIEW_E2E_PARENT_KEY,
        summary: TASK_VIEW_E2E_PARENT_SUMMARY,
      },
      summary: "First task",
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

/** Register immediately before opening a task row so issue-details can be awaited. */
export function beginWaitingForIssueDetails(
  page: Page,
  config: PlatformE2eConfig,
  issueKey = TASK_VIEW_E2E_ISSUE_KEY,
): Promise<void> {
  return page
    .waitForResponse(
      (response) =>
        response.request().method() === "GET" &&
        response.ok() &&
        isIssueDetailPath(new URL(response.url()).pathname, config.platformName, issueKey),
      { timeout: APP_READY_TIMEOUT },
    )
    .then(() => undefined);
}

/** Register immediately before posting a comment so the create response can be awaited. */
export function beginWaitingForCommentPost(page: Page, config: PlatformE2eConfig): Promise<void> {
  return page
    .waitForResponse(
      (response) =>
        response.url().includes(`/api/${config.platformName}/comments`) &&
        response.request().method() === "POST" &&
        response.ok(),
      { timeout: APP_READY_TIMEOUT },
    )
    .then(() => undefined);
}

/** Register immediately before changing task status so the transition response can be awaited. */
export function beginWaitingForStatusTransition(
  page: Page,
  config: PlatformE2eConfig,
  issueKey = TASK_VIEW_E2E_ISSUE_KEY,
): Promise<void> {
  return page
    .waitForResponse(
      (response) =>
        response.url().includes(`/api/${config.platformName}/issues/${issueKey}/transitions`) &&
        response.request().method() === "POST" &&
        response.ok(),
      { timeout: APP_READY_TIMEOUT },
    )
    .then(() => undefined);
}

/**
 * Installs list mocks plus issue detail, comments, and transition routes for view-task E2E.
 */
export async function installTaskViewApiMocks(
  page: Page,
  config: PlatformE2eConfig,
  options: TaskViewMockOptions = {},
): Promise<void> {
  const { comments = [], attachments, delayIssueDetailsMs = 600, ...listOptions } = options;
  let issueStatus = statusToDo;
  const liveAttachments: MockTaskAttachment[] =
    attachments ?? (config.hasAttachments ? [{ ...E2E_SAMPLE_EXISTING_ATTACHMENT }] : []);
  const normalizedComments = normalizeMockComments(config, comments);
  const liveComments = [...normalizedComments];
  let nextCommentId = normalizedComments.length;

  const viewTransitions = [
    {
      id: "tr-1",
      name: "Start Progress",
      to: statusInProgress,
    },
  ];

  await installTaskListApiMocks(page, config, listOptions);

  if (config.hasComments && !config.hasAssignees) {
    await page.route(apiPattern(config, "/current-user"), async (route) => {
      await route.fulfill({
        status: 200,
        contentType: "application/json",
        body: JSON.stringify(E2E_COMMENT_AUTHOR),
      });
    });
  }

  if (config.hasStatusTransitions) {
    await page.route(
      apiPrefixPattern(config, `/issues/${TASK_VIEW_E2E_ISSUE_KEY}/transitions`),
      async (route) => {
        if (route.request().method() === "POST") {
          const payload = route.request().postDataJSON() as { transitionId?: string };
          const transition = viewTransitions.find((item) => item.id === payload.transitionId);
          if (transition) {
            issueStatus = transition.to;
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

  await page.route(apiPattern(config, `/issues/${TASK_VIEW_E2E_ISSUE_KEY}`), async (route) => {
    if (route.request().method() !== "GET") {
      await route.continue();
      return;
    }

    if (delayIssueDetailsMs > 0) {
      await new Promise((resolve) => setTimeout(resolve, delayIssueDetailsMs));
    }

    await route.fulfill({
      status: 200,
      contentType: "application/json",
      body: JSON.stringify(buildViewIssueDetails(config, issueStatus, liveAttachments)),
    });
  });

  if (config.hasComments) {
    await page.route(apiPrefixPattern(config, "/comments"), async (route) => {
      const url = new URL(route.request().url());
      const issueIdOrKey = url.searchParams.get("issueIdOrKey");
      const method = route.request().method();

      if (method === "POST") {
        const payload = route.request().postDataJSON() as {
          text?: string;
          replyToCommentId?: string;
        };
        nextCommentId += 1;
        const newComment: TaskViewMockComment = {
          id: `comment-${nextCommentId}`,
          body: buildMockCommentBody(config, payload.text ?? ""),
          author: E2E_COMMENT_AUTHOR,
          created: new Date().toISOString(),
          updated: new Date().toISOString(),
          ...(payload.replyToCommentId ? { parentCommentId: payload.replyToCommentId } : {}),
        };
        liveComments.push(newComment);

        await route.fulfill({
          status: 200,
          contentType: "application/json",
          body: JSON.stringify(newComment),
        });
        return;
      }

      if (method !== "GET" || issueIdOrKey !== TASK_VIEW_E2E_ISSUE_KEY) {
        await route.continue();
        return;
      }

      await route.fulfill({
        status: 200,
        contentType: "application/json",
        body: JSON.stringify({
          startAt: 0,
          maxResults: liveComments.length,
          total: liveComments.length,
          comments: liveComments,
        }),
      });
    });
  }

  if (config.hasAttachments) {
    await installTaskAttachmentApiMocks(page, config, liveAttachments);
  }
}

export const TASK_VIEW_E2E_DEMO_PROJECT = TASK_LIST_E2E_PROJECTS.demo;
