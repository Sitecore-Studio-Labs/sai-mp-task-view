import type { Page } from "@playwright/test";

import type { PlatformE2eConfig } from "../config/platform-e2e-config";
import { APP_READY_TIMEOUT } from "../constants/timeouts";
import {
  apiPrefixPattern,
  installTaskListApiMocks,
  type MockTaskListIssue,
  TASK_LIST_E2E_ISSUES,
  TASK_LIST_E2E_PROJECTS,
  type TaskListMockOptions,
} from "./task-list-mock";

export const TASK_DELETE_E2E_ISSUE_KEY = "DEMO-1";
export const TASK_DELETE_E2E_OTHER_ISSUE_KEY = "DEMO-2";

export const TASK_DELETE_E2E_ISSUES: MockTaskListIssue[] = TASK_LIST_E2E_ISSUES.filter(
  (issue) =>
    issue.key === TASK_DELETE_E2E_ISSUE_KEY || issue.key === TASK_DELETE_E2E_OTHER_ISSUE_KEY,
);

export type TaskDeletePermissionState = {
  canDelete: boolean;
  canEdit?: boolean;
};

export type TaskDeleteMockOptions = TaskListMockOptions & {
  /** Mutable permission flags used by the permissions API mock. */
  permissions?: TaskDeletePermissionState;
};

function issueKeyFromPath(pathname: string, platformName: string): string | null {
  const match = pathname.match(new RegExp(`/api/${platformName}/issues/([^/]+)$`));
  return match?.[1] ?? null;
}

function buildDeleteIssueDetail(issue: MockTaskListIssue) {
  return {
    id: issue.id,
    key: issue.key,
    fields: {
      summary: issue.fields.summary,
      status: issue.fields.status,
      assignee: issue.fields.assignee,
      priority: issue.fields.priority,
      reporter: {
        accountId: "acct-reporter",
        displayName: "John Reporter",
        avatarUrls: { "48x48": "https://example.test/avatar-reporter.png" },
      },
      issuetype: { id: "it-task", name: "Task" },
      subtasks: [],
      attachment: [],
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

/** Register immediately before confirming delete in the task-details dialog. */
export async function beginWaitingForIssueDelete(
  page: Page,
  config: PlatformE2eConfig,
  issueKey: string,
): Promise<void> {
  const issuePath = `/api/${config.platformName}/issues/${issueKey}`;
  await page.waitForResponse(
    (response) =>
      response.url().includes(issuePath) &&
      response.request().method() === "DELETE" &&
      response.status() === 204,
    { timeout: APP_READY_TIMEOUT },
  );
}

/**
 * Installs list mocks with mutable issue state, permission-aware DELETE_ISSUES checks,
 * and issue detail/delete routes for delete-task E2E.
 */
export async function installTaskDeleteApiMocks(
  page: Page,
  config: PlatformE2eConfig,
  options: TaskDeleteMockOptions = {},
): Promise<void> {
  const permissions: TaskDeletePermissionState = options.permissions ?? { canDelete: true };
  const issueState = {
    issues: [...(options.issues ?? TASK_DELETE_E2E_ISSUES)],
  };

  await installTaskListApiMocks(page, config, {
    ...options,
    projects: [{ ...TASK_LIST_E2E_PROJECTS.demo }],
    issues: issueState.issues,
    issuesLoadDelayMs: 0,
  });

  await page.unroute(apiPrefixPattern(config, "/permissions")).catch(() => undefined);
  await page.route(apiPrefixPattern(config, "/permissions"), async (route) => {
    const url = new URL(route.request().url());
    const permission = url.searchParams.get("permission") ?? "";
    let hasPermission = true;

    if (permission === "DELETE_ISSUES") {
      hasPermission = permissions.canDelete;
    } else if (permission === "EDIT_ISSUES") {
      hasPermission = permissions.canEdit ?? true;
    }

    await route.fulfill({
      status: 200,
      contentType: "application/json",
      body: JSON.stringify({ hasPermission }),
    });
  });

  await page.route(
    apiPrefixPattern(config, `/issues/${TASK_DELETE_E2E_ISSUE_KEY}/transitions`),
    async (route) => {
      await route.fulfill({
        status: 200,
        contentType: "application/json",
        body: JSON.stringify({ transitions: [] }),
      });
    },
  );

  await page.unroute(apiPrefixPattern(config, "/issues")).catch(() => undefined);
  await page.route(apiPrefixPattern(config, "/issues"), async (route) => {
    const url = new URL(route.request().url());
    const issueKey = issueKeyFromPath(url.pathname, config.platformName);

    if (route.request().method() === "DELETE" && issueKey) {
      issueState.issues = issueState.issues.filter((issue) => issue.key !== issueKey);
      await route.fulfill({ status: 204, body: "" });
      return;
    }

    if (route.request().method() === "GET" && issueKey) {
      const issue = issueState.issues.find((item) => item.key === issueKey);
      if (!issue) {
        await route.fulfill({
          status: 404,
          contentType: "application/json",
          body: JSON.stringify({ error: "Not found" }),
        });
        return;
      }

      await route.fulfill({
        status: 200,
        contentType: "application/json",
        body: JSON.stringify(buildDeleteIssueDetail(issue)),
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

  if (config.hasComments) {
    await page.route(apiPrefixPattern(config, "/comments"), async (route) => {
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
}

export const TASK_DELETE_E2E_DEMO_PROJECT = TASK_LIST_E2E_PROJECTS.demo;
