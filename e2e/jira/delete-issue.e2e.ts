import { expect, type Page, test } from "@playwright/test";

import { JiraIssue, JiraPriority, JiraStatus, JiraUser } from "@/types/jira";

type JiraProject = { id: string; key: string; name: string };
type JiraSite = { id: string; name: string; url: string };

function buildIssue(params: {
  id: string;
  key: string;
  summary: string;
  statusName?: string;
  priorityName?: string;
  assigneeName?: string;
}): JiraIssue {
  const status: JiraStatus = {
    id: "1",
    name: params.statusName ?? "To Do",
    description: "",
    statusCategory: { id: "1", key: "new", name: "To Do" },
  };

  const priority: JiraPriority = {
    id: "2",
    name: params.priorityName ?? "Medium",
  };

  const assignee: JiraUser = {
    accountId: "acc-1",
    displayName: params.assigneeName ?? "Test User",
  };

  const reporter: JiraUser = { accountId: "acc-2", displayName: "Reporter" };

  return {
    id: params.id,
    key: params.key,
    fields: {
      summary: params.summary,
      status,
      issuetype: { id: "10001", name: "Task" },
      priority,
      assignee,
      reporter,
      subtasks: [],
    },
  };
}

async function installApiMocks(params: {
  page: Page;
  hasPermission: boolean;
  issues: JiraIssue[];
  project: JiraProject;
  site: JiraSite;
}) {
  const { page, hasPermission, project, site } = params;
  const state = {
    issues: [...params.issues],
  };

  const json = (data: unknown, status = 200) => ({
    status,
    contentType: "application/json",
    body: JSON.stringify(data),
  });

  await page.route("**/api/auth/jira/status", async (route) => {
    await route.fulfill(json({ connected: true }));
  });

  await page.route("**/api/jira/sites", async (route) => {
    await route.fulfill(json({ resources: [site], selectedSite: site.id }));
  });

  await page.route("**/api/jira/projects", async (route) => {
    await route.fulfill(json([project]));
  });

  await page.route(`**/api/jira/statuses/${project.key}`, async (route) => {
    await route.fulfill(
      json([
        {
          id: "cat-1",
          name: "Default",
          statuses: [
            {
              id: "1",
              name: "To Do",
              description: "",
              statusCategory: { id: "1", key: "new", name: "To Do" },
            },
          ],
        },
      ]),
    );
  });

  await page.route("**/api/jira/priorities", async (route) => {
    await route.fulfill(json([{ id: "2", name: "Medium" }]));
  });

  await page.route("**/api/jira/current-user", async (route) => {
    await route.fulfill(json({ accountId: "acc-1", displayName: "Test User" }));
  });

  await page.route("**/api/jira/assignees**", async (route) => {
    await route.fulfill(json([{ accountId: "acc-1", displayName: "Test User" }]));
  });

  await page.route("**/api/jira/issues?**", async (route) => {
    const url = new URL(route.request().url());
    const projectKey = url.searchParams.get("projectKey");
    if (projectKey !== project.key) {
      await route.fulfill(json({ issues: [], isLast: true }));
      return;
    }
    await route.fulfill(json({ issues: state.issues, isLast: true }));
  });

  await page.route("**/api/jira/issues/*", async (route) => {
    const url = new URL(route.request().url());

    if (route.request().method() === "DELETE") {
      await route.fallback();
      return;
    }

    const match = url.pathname.match(/\/api\/jira\/issues\/([^/]+)$/);
    const issueKey = match?.[1];
    const issue = state.issues.find((i) => i.key === issueKey) ?? null;
    if (!issue) {
      await route.fulfill(json({ error: "Not found" }, 404));
      return;
    }
    await route.fulfill(json(issue));
  });

  await page.route("**/api/jira/issues/*/transitions", async (route) => {
    await route.fulfill(json({ transitions: [] }));
  });

  await page.route("**/api/jira/comments**", async (route) => {
    await route.fulfill(json({ comments: [] }));
  });

  await page.route("**/api/jira/permissions**", async (route) => {
    await route.fulfill(json({ hasPermission }));
  });

  await page.route("**/api/jira/issues/*", async (route) => {
    if (route.request().method() !== "DELETE") {
      await route.fallback();
      return;
    }

    const url = new URL(route.request().url());
    const match = url.pathname.match(/\/api\/jira\/issues\/([^/]+)$/);
    const issueKey = match?.[1];
    state.issues = state.issues.filter((i) => i.key !== issueKey);
    await route.fulfill({ status: 204, body: "" });
  });

  await page.route("**/api/jira/select-project**", async (route) => {
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

async function openProjectAndSelectIssue(page: Page, projectName: string, issueKey: string) {
  await page.goto("/task-manager-extension", { waitUntil: "domcontentloaded" });
  await expect(page.getByText("Connected to Jira")).toBeVisible({ timeout: 15_000 });

  await page.getByLabel("Select a project").click();
  await page.getByRole("option", { name: projectName }).click();

  const row = page.locator("li", { hasText: issueKey }).getByRole("button");
  await row.click();

  const dialog = page.getByRole("dialog");
  await expect(dialog).toBeVisible();
  await expect(dialog.getByText(issueKey, { exact: true })).toBeVisible();
}

test.describe("Jira delete issue", () => {
  test("disables Delete when user has no delete permission", async ({ page }) => {
    const project = { id: "p-1", key: "PROJ", name: "Project PROJ" };
    const site = { id: "cloud-1", name: "Jira", url: "https://example.atlassian.net" };
    const issue = buildIssue({ id: "i-1", key: "PROJ-1", summary: "Issue one" });

    await installApiMocks({
      page,
      hasPermission: false,
      issues: [issue],
      project,
      site,
    });

    await openProjectAndSelectIssue(page, project.name, issue.key);

    const dialog = page.getByRole("dialog");
    const deleteWrapper = dialog.locator('div[title="No permission to delete"]');
    const deleteButton = deleteWrapper.getByRole("button", { name: "Delete" });
    await expect(deleteButton).toBeDisabled();
  });

  test("allows deleting an issue when user has permission", async ({ page }) => {
    const project = { id: "p-1", key: "PROJ", name: "Project PROJ" };
    const site = { id: "cloud-1", name: "Jira", url: "https://example.atlassian.net" };
    const issue = buildIssue({ id: "i-1", key: "PROJ-1", summary: "Issue one" });
    const other = buildIssue({ id: "i-2", key: "PROJ-2", summary: "Issue two" });

    await installApiMocks({
      page,
      hasPermission: true,
      issues: [issue, other],
      project,
      site,
    });

    await openProjectAndSelectIssue(page, project.name, issue.key);

    const deleteButton = page.getByRole("button", { name: "Delete" });
    await expect(deleteButton).toBeEnabled();

    await deleteButton.click();
    await expect(page.getByText("Delete Task", { exact: true })).toBeVisible();

    const alertDialog = page.locator("role=alertdialog", { hasText: "Delete Task" });
    await expect(alertDialog).toBeVisible();
    const confirm = alertDialog.getByRole("button", { name: "Delete", exact: true });
    await confirm.click();

    await expect(alertDialog).toBeHidden();

    await page.reload({ waitUntil: "domcontentloaded" });
    await expect(page.getByText("Connected to Jira")).toBeVisible({ timeout: 15_000 });
    await page.getByLabel("Select a project").click();
    await page.getByRole("option", { name: project.name }).click();

    await expect(page.locator("li", { hasText: issue.key })).toHaveCount(0);
    await expect(page.locator("li", { hasText: other.key })).toHaveCount(1);
  });
});
