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

export const TASK_CREATE_E2E_NEW_TASK_SUMMARY = "E2E - New Task";
export const TASK_CREATE_E2E_DEMO_PROJECT = TASK_LIST_E2E_PROJECTS.demo;

export const TASK_CREATE_E2E_ISSUE_TYPES = [
  { id: "it-task", name: "Task" },
  { id: "it-subtask", name: "Sub-task" },
] as const;

export type TaskCreatePermissionState = {
  canCreate: boolean;
};

export type TaskCreateMockOptions = TaskListMockOptions & {
  /** Mutable permission flags used by the permissions API mock. */
  permissions?: TaskCreatePermissionState;
  issueTypes?: Array<{ id: string; name: string; iconUrl?: string }>;
};

export type TaskCreateMockResult = {
  key: string;
};

type CreateTaskRequestPayload = {
  projectId: string;
  issueTypeId: string;
  summary: string;
  description?: string;
  priority?: string;
  parentIssueKey?: string;
  assignee?: string;
  dueDate?: string;
};

function nextIssueKey(issues: MockTaskListIssue[], projectKey: string): string {
  const numbers = issues
    .map((issue) => {
      const match = issue.key.match(new RegExp(`^${projectKey}-(\\d+)$`));
      return match ? Number.parseInt(match[1], 10) : 0;
    })
    .filter((value) => value > 0);

  const next = numbers.length > 0 ? Math.max(...numbers) + 1 : 1;
  return `${projectKey}-${next}`;
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

/** Register immediately before submitting the create-task form. */
export function beginWaitingForTaskCreate(
  page: Page,
  config: PlatformE2eConfig,
): Promise<TaskCreateMockResult> {
  const issuesPath = `/api/${config.platformName}/issues`;
  return page
    .waitForResponse(
      (response) =>
        response.url().includes(issuesPath) &&
        response.request().method() === "POST" &&
        response.ok(),
      { timeout: APP_READY_TIMEOUT },
    )
    .then(async (response) => {
      const body = (await response.json()) as { key: string };
      return { key: body.key };
    });
}

/**
 * Installs list mocks with mutable issue state, permission-aware CREATE_ISSUES checks,
 * issue-type metadata, and POST /issues for create-task E2E.
 */
export async function installTaskCreateApiMocks(
  page: Page,
  config: PlatformE2eConfig,
  options: TaskCreateMockOptions = {},
): Promise<void> {
  const permissions: TaskCreatePermissionState = options.permissions ?? { canCreate: true };
  const issueTypes = options.issueTypes ?? [...TASK_CREATE_E2E_ISSUE_TYPES];
  const issueState = {
    issues: [...(options.issues ?? TASK_LIST_E2E_ISSUES)],
  };

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

    if (permission === "CREATE_ISSUES") {
      hasPermission = permissions.canCreate;
    }

    await route.fulfill({
      status: 200,
      contentType: "application/json",
      body: JSON.stringify({ hasPermission }),
    });
  });

  await page.unroute(apiPrefixPattern(config, "/issues")).catch(() => undefined);
  await page.route(apiPrefixPattern(config, "/issues"), async (route) => {
    const url = new URL(route.request().url());
    const projectKey = url.searchParams.get("projectKey") ?? "";

    if (route.request().method() === "POST") {
      const payload = (await route.request().postDataJSON()) as CreateTaskRequestPayload;
      const project = TASK_LIST_E2E_PROJECTS.demo;
      const issueType = issueTypes.find((type) => type.id === payload.issueTypeId) ?? issueTypes[0];
      const key = nextIssueKey(issueState.issues, project.key);

      const createdIssue: MockTaskListIssue = {
        id: String(Date.now()),
        key,
        fields: {
          summary: payload.summary,
          status: { id: "st-todo", name: "To Do", statusCategory: { key: "new" } },
          priority: { id: "pri-medium", name: "Medium" },
        },
      };

      issueState.issues = [createdIssue, ...issueState.issues];

      await route.fulfill({
        status: 200,
        contentType: "application/json",
        body: JSON.stringify({
          id: createdIssue.id,
          key: createdIssue.key,
          summary: createdIssue.fields.summary,
          projectId: payload.projectId,
          projectKey: project.key,
          issueTypeId: issueType.id,
          issueTypeName: issueType.name,
        }),
      });
      return;
    }

    if (route.request().method() === "GET") {
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
}
