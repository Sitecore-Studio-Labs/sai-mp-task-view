import type { Page } from "@playwright/test";

import type { PlatformE2eConfig } from "../config/platform-e2e-config";
import { APP_READY_TIMEOUT } from "../constants/timeouts";
import {
  apiPattern,
  apiPrefixPattern,
  installTaskListApiMocks,
  TASK_LIST_E2E_PROJECTS,
  type TaskListMockOptions,
} from "./task-list-mock";

export const TASK_VIEW_E2E_ISSUE_KEY = "DEMO-1";
export const TASK_VIEW_E2E_PARENT_KEY = "DEMO-0";
export const TASK_VIEW_E2E_SUBTASK_KEY = "DEMO-1-1";

const statusToDo = { id: "st-todo", name: "To Do", statusCategory: { key: "new" } };
const statusInProgress = {
  id: "st-in-progress",
  name: "In Progress",
  statusCategory: { key: "indeterminate" },
};
const statusDone = { id: "st-done", name: "Done", statusCategory: { key: "done" } };

const viewIssueDescriptionAdf = {
  type: "doc",
  version: 1,
  content: [
    {
      type: "paragraph",
      content: [{ type: "text", text: "Issue description text." }],
    },
  ],
};

export type TaskViewMockComment = {
  id: string;
  body: {
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
};

export const TASK_VIEW_E2E_SAMPLE_COMMENT: TaskViewMockComment = {
  id: "comment-1",
  body: {
    type: "doc",
    version: 1,
    content: [
      {
        type: "paragraph",
        content: [{ type: "text", text: "This is a test comment." }],
      },
    ],
  },
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
  /** Simulates a brief loading state on the issue-details response. */
  delayIssueDetailsMs?: number;
};

function buildViewIssueDetails() {
  return {
    id: "1",
    key: TASK_VIEW_E2E_ISSUE_KEY,
    fields: {
      parent: {
        id: "parent-1",
        key: TASK_VIEW_E2E_PARENT_KEY,
        fields: { summary: "Parent issue", status: statusInProgress },
      },
      summary: "First task",
      description: viewIssueDescriptionAdf,
      status: statusToDo,
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
      attachment: [],
    },
  };
}

/** Register immediately before opening a task row so issue-details can be awaited. */
export function beginWaitingForIssueDetails(
  page: Page,
  config: PlatformE2eConfig,
  issueKey = TASK_VIEW_E2E_ISSUE_KEY,
): Promise<void> {
  const issuePath = `/api/${config.platformName}/issues/${issueKey}`;
  return page.waitForResponse((response) => response.url().includes(issuePath) && response.ok(), {
    timeout: APP_READY_TIMEOUT,
  });
}

/**
 * Installs list mocks plus issue detail, comments, and transition routes for view-task E2E.
 */
export async function installTaskViewApiMocks(
  page: Page,
  config: PlatformE2eConfig,
  options: TaskViewMockOptions = {},
): Promise<void> {
  const { comments = [], delayIssueDetailsMs = 600, ...listOptions } = options;
  const issueDetails = buildViewIssueDetails();

  await installTaskListApiMocks(page, config, listOptions);

  await page.route(
    apiPrefixPattern(config, `/issues/${TASK_VIEW_E2E_ISSUE_KEY}/transitions`),
    async (route) => {
      await route.fulfill({
        status: 200,
        contentType: "application/json",
        body: JSON.stringify({
          transitions: [
            {
              id: "tr-1",
              name: "Start Progress",
              to: statusInProgress,
            },
          ],
        }),
      });
    },
  );

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
      body: JSON.stringify(issueDetails),
    });
  });

  if (config.hasComments) {
    await page.route(apiPrefixPattern(config, "/comments"), async (route) => {
      const url = new URL(route.request().url());
      const issueIdOrKey = url.searchParams.get("issueIdOrKey");
      if (issueIdOrKey !== TASK_VIEW_E2E_ISSUE_KEY) {
        await route.continue();
        return;
      }

      await route.fulfill({
        status: 200,
        contentType: "application/json",
        body: JSON.stringify({
          startAt: 0,
          maxResults: comments.length,
          total: comments.length,
          comments,
        }),
      });
    });
  }
}

export const TASK_VIEW_E2E_DEMO_PROJECT = TASK_LIST_E2E_PROJECTS.demo;
