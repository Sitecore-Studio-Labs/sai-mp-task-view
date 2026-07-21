import { expect, type Page } from "@playwright/test";

import type { PlatformE2eConfig } from "../config/platform-e2e-config";
import { APP_READY_TIMEOUT } from "../constants/timeouts";

export type MockTaskListIssue = {
  id: string;
  key: string;
  fields: {
    summary: string;
    status: { id: string; name: string; statusCategory: { key: string } };
    priority?: { id: string; name: string; iconUrl?: string };
    assignee?: { accountId: string; displayName: string; avatarUrls?: Record<string, string> };
  };
};

export type MockTaskListProject = {
  id: string;
  key: string;
  name: string;
  /** Issues API returns 500 for this project key. */
  errorOnIssues?: boolean;
  /** Issues API returns an empty list for this project key. */
  emptyIssues?: boolean;
};

export const TASK_LIST_E2E_SITE_ID = "cloud-1";

export const TASK_LIST_E2E_PROJECTS = {
  demo: { id: "10001", key: "DEMO", name: "Demo Project" },
  empty: { id: "10002", key: "EMPTY", name: "Empty Project" },
  broken: { id: "10003", key: "BAD", name: "Broken Project" },
} as const;

export const TASK_LIST_E2E_ISSUES: MockTaskListIssue[] = [
  {
    id: "1",
    key: "DEMO-1",
    fields: {
      summary: "First task",
      status: { id: "st-todo", name: "To Do", statusCategory: { key: "new" } },
      priority: { id: "pri-high", name: "High" },
      assignee: {
        accountId: "acct-alice",
        displayName: "Alice",
        avatarUrls: { "48x48": "https://example.test/avatar-alice.png" },
      },
    },
  },
  {
    id: "2",
    key: "DEMO-2",
    fields: {
      summary: "Second task",
      status: { id: "st-done", name: "Done", statusCategory: { key: "done" } },
      priority: { id: "pri-low", name: "Low" },
      assignee: {
        accountId: "acct-bob",
        displayName: "Bob",
        avatarUrls: { "48x48": "https://example.test/avatar-bob.png" },
      },
    },
  },
  {
    id: "3",
    key: "DEMO-3",
    fields: {
      summary: "Unassigned task",
      status: { id: "st-todo", name: "To Do", statusCategory: { key: "new" } },
      priority: { id: "pri-low", name: "Low" },
    },
  },
];

export type TaskListMockOptions = {
  projects?: MockTaskListProject[];
  issues?: MockTaskListIssue[];
  /** Simulates a brief loading state on the first issues response. */
  issuesLoadDelayMs?: number;
};

function escapeRegExp(value: string): string {
  return value.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
}

/** True when the URL targets issue attachment upload (not list/detail issue routes). */
export function isIssueAttachmentsUploadPath(pathname: string, platformName: string): boolean {
  return pathname.includes(`/api/${platformName}/issues/`) && pathname.endsWith("/attachments");
}

/** True when the URL targets issue status transitions (not list/detail issue routes). */
export function isIssueTransitionsPath(pathname: string, platformName: string): boolean {
  return pathname.includes(`/api/${platformName}/issues/`) && pathname.includes("/transitions");
}

/** Playwright route pattern for POST /issues/{key}/attachments only. */
export function issueAttachmentsUploadPattern(config: PlatformE2eConfig): RegExp {
  const normalized = `/api/${config.platformName}/issues/`;
  return new RegExp(`${escapeRegExp(normalized)}[^/]+/attachments.*`);
}

/** True when the URL is GET/PATCH issue detail for a specific key (not list, transitions, or uploads). */
export function isIssueDetailPath(
  pathname: string,
  platformName: string,
  issueKey: string,
): boolean {
  const match = pathname.match(new RegExp(`/api/${platformName}/issues/([^/]+)$`));
  return match?.[1] === issueKey;
}

export function apiPattern(config: PlatformE2eConfig, path: string): RegExp {
  const normalized = `/api/${config.platformName}${path}`;
  return new RegExp(`${escapeRegExp(normalized)}(\\?.*)?$`);
}

export function apiPrefixPattern(config: PlatformE2eConfig, pathPrefix: string): RegExp {
  const normalized = `/api/${config.platformName}${pathPrefix}`;
  return new RegExp(`${escapeRegExp(normalized)}.*`);
}

function uniqByKey<T extends { key: string }>(items: T[]): T[] {
  const seen = new Set<string>();
  return items.filter((item) => {
    if (seen.has(item.key)) return false;
    seen.add(item.key);
    return true;
  });
}

function defaultProjects(): MockTaskListProject[] {
  return [
    { ...TASK_LIST_E2E_PROJECTS.demo },
    { ...TASK_LIST_E2E_PROJECTS.empty, emptyIssues: true },
    { ...TASK_LIST_E2E_PROJECTS.broken, errorOnIssues: true },
  ];
}

function projectsApiPath(config: PlatformE2eConfig): string {
  return `/api/${config.platformName}/projects`;
}

/**
 * Minimal BFF mocks for connected task-manager shell routes (sites/projects only).
 * Use in scenarios that open settings or scope UI without exercising the task list.
 */
export async function installTaskManagerShellApiMocks(
  page: Page,
  config: PlatformE2eConfig,
  options: Pick<TaskListMockOptions, "projects"> = {},
): Promise<void> {
  const projects = options.projects ?? [{ ...TASK_LIST_E2E_PROJECTS.demo }];

  if (config.hasSites) {
    await page.unroute(apiPattern(config, "/sites")).catch(() => undefined);
    await page.route(apiPattern(config, "/sites"), async (route) => {
      await route.fulfill({
        status: 200,
        contentType: "application/json",
        body: JSON.stringify({
          resources: [
            {
              id: TASK_LIST_E2E_SITE_ID,
              url: "https://example.test",
              name: "Example Site",
            },
          ],
          selectedSite: TASK_LIST_E2E_SITE_ID,
        }),
      });
    });
  }

  await page.unroute(apiPattern(config, "/projects")).catch(() => undefined);
  await page.route(apiPattern(config, "/projects"), async (route) => {
    await route.fulfill({
      status: 200,
      contentType: "application/json",
      body: JSON.stringify(projects),
    });
  });
}

/**
 * Register before navigation so task-manager shell data (setup, sites, scoped projects)
 * is awaited after {@link gotoTaskManager}.
 */
export function beginWaitingForTaskListShellData(
  page: Page,
  config: PlatformE2eConfig,
): Promise<void> {
  const waits: Promise<unknown>[] = [];

  if (config.hasSetupWizard && config.setupApiPath) {
    waits.push(
      page.waitForResponse(
        (response) => response.url().includes(config.setupApiPath!) && response.ok(),
        { timeout: APP_READY_TIMEOUT },
      ),
    );
  }

  if (config.hasSites) {
    waits.push(
      page.waitForResponse(
        (response) => response.url().includes(`/api/${config.platformName}/sites`) && response.ok(),
        { timeout: APP_READY_TIMEOUT },
      ),
    );
  }

  waits.push(
    page.waitForResponse(
      (response) => {
        if (!response.url().includes(projectsApiPath(config)) || !response.ok()) {
          return false;
        }
        if (!config.hasSites) {
          return true;
        }
        const url = new URL(response.url());
        return Boolean(url.searchParams.get("siteId"));
      },
      { timeout: APP_READY_TIMEOUT },
    ),
  );

  return Promise.all(waits).then(() => undefined);
}

/** Wait until scoped project data is available through the mocked BFF routes. */
export async function waitForTaskListProjectsMock(
  page: Page,
  config: PlatformE2eConfig,
): Promise<void> {
  await expect
    .poll(
      async () =>
        page.evaluate(
          async ({ platform, hasSites, siteId }) => {
            let selectedSiteId: string | null = null;
            if (hasSites) {
              const sitesRes = await fetch(`/api/${platform}/sites`);
              if (!sitesRes.ok) return 0;
              const sites = (await sitesRes.json()) as {
                selectedSite?: string | null;
                resources?: Array<{ id: string }>;
              };
              selectedSiteId = sites.selectedSite ?? sites.resources?.[0]?.id ?? siteId;
              if (!selectedSiteId) return 0;
            }

            const query = selectedSiteId ? `?siteId=${encodeURIComponent(selectedSiteId)}` : "";
            const projectsRes = await fetch(`/api/${platform}/projects${query}`);
            if (!projectsRes.ok) return 0;
            const projects = await projectsRes.json();
            return Array.isArray(projects) ? projects.length : 0;
          },
          {
            platform: config.platformName,
            hasSites: config.hasSites,
            siteId: TASK_LIST_E2E_SITE_ID,
          },
        ),
      { timeout: APP_READY_TIMEOUT },
    )
    .toBeGreaterThan(0);
}

/**
 * Installs BFF route mocks for the connected task-list journey:
 * projects, issues (with filter support), and optional metadata routes
 * gated by {@link PlatformE2eConfig} capability flags.
 */
export async function installTaskListApiMocks(
  page: Page,
  config: PlatformE2eConfig,
  options: TaskListMockOptions = {},
): Promise<void> {
  const projects = options.projects ?? defaultProjects();
  const allIssues = options.issues ?? TASK_LIST_E2E_ISSUES;
  const issuesLoadDelayMs = options.issuesLoadDelayMs ?? 150;

  if (config.hasSites) {
    await page.route(apiPattern(config, "/sites"), async (route) => {
      await route.fulfill({
        status: 200,
        contentType: "application/json",
        body: JSON.stringify({
          resources: [
            {
              id: TASK_LIST_E2E_SITE_ID,
              url: "https://example.atlassian.net",
              name: "Example Site",
            },
          ],
          selectedSite: TASK_LIST_E2E_SITE_ID,
        }),
      });
    });
  }

  await page.route(apiPattern(config, "/projects"), async (route) => {
    await route.fulfill({
      status: 200,
      contentType: "application/json",
      body: JSON.stringify(projects),
    });
  });

  if (config.hasPriorities) {
    await page.route(apiPattern(config, "/project-priorities"), async (route) => {
      await route.fulfill({
        status: 200,
        contentType: "application/json",
        body: JSON.stringify([
          { id: "pri-high", name: "High", iconUrl: "" },
          { id: "pri-low", name: "Low", iconUrl: "" },
        ]),
      });
    });
  }

  if (config.hasAssignees) {
    await page.route(apiPattern(config, "/current-user"), async (route) => {
      await route.fulfill({
        status: 200,
        contentType: "application/json",
        body: JSON.stringify({
          accountId: "acct-alice",
          displayName: "Alice",
          avatarUrls: { "48x48": "https://example.test/avatar-alice.png" },
        }),
      });
    });

    await page.route(apiPrefixPattern(config, "/assignees"), async (route) => {
      await route.fulfill({
        status: 200,
        contentType: "application/json",
        body: JSON.stringify([
          {
            accountId: "acct-alice",
            displayName: "Alice",
            avatarUrls: { "48x48": "https://example.test/avatar-alice.png" },
          },
          {
            accountId: "acct-bob",
            displayName: "Bob",
            avatarUrls: { "48x48": "https://example.test/avatar-bob.png" },
          },
        ]),
      });
    });
  }

  await page.route(apiPrefixPattern(config, "/statuses/"), async (route) => {
    // Shape matches PlatformProjectStatuses (id/name/statuses) used by workflow-scoped
    // pickers (e.g. Wrike). Include In Progress so status-change e2e can select it.
    await route.fulfill({
      status: 200,
      contentType: "application/json",
      body: JSON.stringify([
        {
          id: TASK_LIST_E2E_PROJECTS.demo.id,
          name: TASK_LIST_E2E_PROJECTS.demo.name,
          statuses: [
            { id: "st-todo", name: "To Do", statusCategory: { key: "new" } },
            {
              id: "st-in-progress",
              name: "In Progress",
              statusCategory: { key: "indeterminate" },
            },
            { id: "st-done", name: "Done", statusCategory: { key: "done" } },
          ],
        },
      ]),
    });
  });

  await page.route(apiPrefixPattern(config, "/permissions"), async (route) => {
    await route.fulfill({
      status: 200,
      contentType: "application/json",
      body: JSON.stringify({ hasPermission: true }),
    });
  });

  const projectByKey = new Map(projects.map((project) => [project.key, project]));

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

    const projectKey = url.searchParams.get("projectKey") ?? "";
    const project = projectByKey.get(projectKey);

    if (project?.errorOnIssues) {
      await route.fulfill({
        status: 500,
        contentType: "application/json",
        body: JSON.stringify({ error: "Failed to search issues." }),
      });
      return;
    }

    if (project?.emptyIssues) {
      await route.fulfill({
        status: 200,
        contentType: "application/json",
        body: JSON.stringify({ issues: [], nextPageToken: null, isLast: true }),
      });
      return;
    }

    if (issuesLoadDelayMs > 0) {
      await new Promise((resolve) => setTimeout(resolve, issuesLoadDelayMs));
    }

    const status = url.searchParams.getAll("status");
    const priority = url.searchParams.getAll("priority");
    const assignee = url.searchParams.getAll("assignee");

    let filtered = [...allIssues];
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

    filtered = uniqByKey(filtered);

    await route.fulfill({
      status: 200,
      contentType: "application/json",
      body: JSON.stringify({ issues: filtered, nextPageToken: null, isLast: true }),
    });
  });

  await page.route(apiPrefixPattern(config, "/select-project"), async (route) => {
    if (route.request().method() !== "POST") {
      await route.continue();
      return;
    }
    await route.fulfill({
      status: 200,
      contentType: "application/json",
      body: JSON.stringify({ success: true }),
    });
  });
}
