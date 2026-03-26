import { expect, type Page, type Route, test } from "@playwright/test";

type MockOptions = {
  issueOverrides?: Partial<Record<string, unknown>>;
  canDelete?: boolean;
  comments?: unknown[];
  delayIssueDetailsMs?: number;
};

function json(route: Route, body: unknown, status = 200) {
  return route.fulfill({
    status,
    contentType: "application/json",
    body: JSON.stringify(body),
  });
}

const installApiMocks = async (
  page: Page,
  hasPermission: boolean = true,
  options: MockOptions = {},
) => {
  const { issueOverrides = {}, comments = [], delayIssueDetailsMs = 0 } = options;

  let currentSummary = "Initial issue summary";

  const project = { id: "10000", key: "PROJ", name: "Demo Project" };

  const statusToDo = { id: "st-1", name: "To Do", statusCategory: { key: "new" } };
  const statusInProgress = {
    id: "st-2",
    name: "In Progress",
    statusCategory: { key: "indeterminate" },
  };
  const statusDone = { id: "st-3", name: "Done", statusCategory: { key: "done" } };

  const taskListIssue = {
    id: "20001",
    key: "PROJ-1",
    fields: {
      summary: "Issue summary",
      status: statusToDo,
      assignee: { accountId: "acc-1", displayName: "Jane Doe", avatarUrls: { "48x48": "" } },
      priority: { id: "p-2", name: "High" },
    },
  };

  const issueDetails = {
    id: "20001",
    key: "PROJ-1",
    fields: {
      parent: {
        id: "20000",
        key: "PROJ-0",
        fields: { summary: "Parent issue", status: statusInProgress },
      },
      summary: currentSummary,
      description: {
        type: "doc",
        version: 1,
        content: [
          {
            type: "paragraph",
            content: [{ type: "text", text: "Issue description text." }],
          },
        ],
      },
      status: statusToDo,
      assignee: { accountId: "acc-1", displayName: "Jane Doe", avatarUrls: { "48x48": "" } },
      reporter: { accountId: "acc-2", displayName: "John Reporter", avatarUrls: { "48x48": "" } },
      duedate: "2026-03-31",
      issuetype: { id: "it-1", name: "Task" },
      priority: { id: "p-2", name: "High" },
      subtasks: [
        {
          id: "20002",
          key: "PROJ-2",
          fields: { summary: "Subtask summary", status: statusDone },
        },
      ],
      attachment: [],
    },
    ...issueOverrides,
  };

  await page.route("**/api/**", async (route) => {
    const url = new URL(route.request().url());
    const path = url.pathname;

    if (path === "/api/auth/jira/status") {
      return json(route, { connected: true });
    }

    if (path === "/api/jira/sites") {
      return json(route, {
        resources: [{ id: "site-1", url: "https://example.atlassian.net", name: "Demo Site" }],
        selectedSite: "site-1",
      });
    }

    if (path === "/api/jira/projects") {
      return json(route, [project]);
    }

    if (path === "/api/jira/issues") {
      return json(route, { issues: [taskListIssue], isLast: true, nextPageToken: null });
    }

    if (path === "/api/jira/statuses/PROJ") {
      return json(route, [
        {
          id: "st-1",
          name: "To Do",
          statuses: [statusToDo, statusInProgress, statusDone],
        },
      ]);
    }

    if (path === "/api/jira/priorities") {
      return json(route, [{ id: "p-2", name: "High" }]);
    }

    if (path === "/api/jira/assignees") {
      return json(route, []);
    }

    if (path === "/api/jira/current-user") {
      return json(route, { accountId: "acc-me", displayName: "Me", avatarUrls: { "48x48": "" } });
    }

    if (path === "/api/jira/comments") {
      return json(route, { comments });
    }

    if (path === "/api/jira/permissions") {
      return json(route, { hasPermission });
    }

    if (path === "/api/jira/issues/PROJ-1") {
      if (delayIssueDetailsMs > 0) {
        await new Promise((r) => setTimeout(r, delayIssueDetailsMs));
      }
      if (route.request().method() === "PATCH") {
        const body = (await route.request().postDataJSON()) as { summary?: string };
        if (typeof body?.summary === "string") currentSummary = body.summary;
      }

      return json(route, {
        ...issueDetails,
        fields: {
          ...issueDetails.fields,
          summary: currentSummary,
        },
      });
    }

    return route.fulfill({ status: 404, body: "Not mocked" });
  });
};

test.describe("View issue details", () => {
  test("should disable edit task button when don't have edit permissions", async ({ page }) => {
    await installApiMocks(page, false);

    await page.goto("/task-manager-extension");

    await page.getByRole("combobox", { name: "Select a project" }).click();
    await page.getByRole("option", { name: "Demo Project" }).click();

    await expect(page.getByText("Issue summary", { exact: true })).toBeVisible();
    await page.getByRole("button", { name: "PROJ-1" }).click();

    const detailsDialog = page.getByRole("dialog", { name: "Task Details" });
    await expect(detailsDialog).toBeVisible();
    await expect(
      detailsDialog.getByRole("heading", { name: "Initial issue summary" }),
    ).toBeVisible();

    const editButton = detailsDialog.getByRole("button", { name: "Edit" });
    await expect(editButton).toBeDisabled();
  });

  test("edit task", async ({ page }) => {
    await installApiMocks(page, true);

    const updatedSummary = "Updated issue summary";

    await page.goto("/task-manager-extension");

    await page.getByRole("combobox", { name: "Select a project" }).click();
    await page.getByRole("option", { name: "Demo Project" }).click();

    await expect(page.getByText("Issue summary", { exact: true })).toBeVisible();
    await page.getByRole("button", { name: "PROJ-1" }).click();

    const detailsDialog = page.getByRole("dialog", { name: "Task Details" });
    await expect(detailsDialog).toBeVisible();
    await expect(
      detailsDialog.getByRole("heading", { name: "Initial issue summary" }),
    ).toBeVisible();

    const editButton = detailsDialog.getByRole("button", { name: "Edit" });
    await expect(editButton).toBeEnabled();

    await editButton.click();
    await expect(page.getByText("Edit Jira Task")).toBeVisible();

    await page.getByLabel("Summary *").fill(updatedSummary);

    await page.getByRole("button", { name: "Save changes" }).click();

    await expect(detailsDialog.getByRole("heading", { name: updatedSummary })).toBeVisible();
  });
});
