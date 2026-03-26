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

const installApiMocks = async (page: Page, options: MockOptions = {}) => {
  const { issueOverrides = {}, comments = [], delayIssueDetailsMs = 0 } = options;

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
      summary: "Issue summary",
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

    if (path === "/api/jira/issues/PROJ-1") {
      if (delayIssueDetailsMs > 0) {
        await new Promise((r) => setTimeout(r, delayIssueDetailsMs));
      }
      return json(route, issueDetails);
    }

    return route.fulfill({ status: 404, body: "Not mocked" });
  });
};

test.describe("View issue details", () => {
  test("shows loading, renders details, and can close back to list", async ({ page }) => {
    await installApiMocks(page, { delayIssueDetailsMs: 600, comments: [] });

    await page.goto("/task-manager-extension");

    await page.getByRole("combobox", { name: "Select a project" }).click();
    await page.getByRole("option", { name: "Demo Project" }).click();

    await expect(page.getByText("Issue summary", { exact: true })).toBeVisible();
    await page.getByRole("button", { name: "Issue summary" }).click();

    await expect(page.getByText("Loading task…", { exact: true })).toBeVisible();
    await expect(page.getByText("Loading task…", { exact: true })).toBeHidden();

    const detailsDialog = page.getByRole("dialog", { name: "Task Details" });
    await expect(page.getByText("PROJ-0", { exact: true })).toBeVisible();
    await expect(detailsDialog.getByText("PROJ-1", { exact: true })).toBeVisible();
    await expect(page.getByRole("heading", { name: "Issue summary" })).toBeVisible();

    await expect(detailsDialog.getByText("Issue description text.", { exact: true })).toBeVisible();

    await expect(detailsDialog.getByRole("heading", { name: "Type" })).toBeVisible();
    await expect(detailsDialog.getByText("Task", { exact: true })).toBeVisible();
    await expect(detailsDialog.getByRole("heading", { name: "Priority" })).toBeVisible();
    await expect(detailsDialog.getByRole("heading", { name: "Reporter" })).toBeVisible();
    await expect(detailsDialog.getByText("John Reporter", { exact: true })).toBeVisible();
    await expect(detailsDialog.getByRole("heading", { name: "Due Date" })).toBeVisible();
    await expect(detailsDialog.getByText("2026-03-31", { exact: true })).toBeVisible();

    await expect(detailsDialog.getByText("Subtasks (1)", { exact: true })).toBeVisible();
    await expect(detailsDialog.getByText("PROJ-2", { exact: true })).toBeVisible();
    await expect(detailsDialog.getByText("Subtask summary", { exact: true })).toBeVisible();

    await expect(detailsDialog.getByText("No comments yet.", { exact: true })).toBeVisible();

    await expect(detailsDialog.getByRole("button", { name: "Edit" })).toBeVisible();
    await expect(detailsDialog.getByRole("button", { name: "Delete" })).toBeVisible();

    await page.getByRole("button", { name: "Close" }).click();
    await expect(page.getByRole("heading", { name: "Issue summary" })).toBeHidden();
    await expect(page.getByText("PROJ-1", { exact: true })).toBeVisible();
  });

  test("shows comments when present", async ({ page }) => {
    const mockComments = [
      {
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
        author: { accountId: "acc-1", displayName: "Jane Doe", avatarUrls: { "48x48": "" } },
        created: "2026-03-26T10:00:00.000Z",
        updated: "2026-03-26T10:00:00.000Z",
      },
    ];

    await installApiMocks(page, { comments: mockComments });

    await page.goto("/task-manager-extension");

    await page.getByRole("combobox", { name: "Select a project" }).click();
    await page.getByRole("option", { name: "Demo Project" }).click();

    await expect(page.getByText("Issue summary", { exact: true })).toBeVisible();
    await page.getByRole("button", { name: "Issue summary" }).click();

    const detailsDialog = page.getByRole("dialog", { name: "Task Details" });

    // Wait for comments to load
    await expect(detailsDialog.getByText("Comments (1)", { exact: true })).toBeVisible();

    // Check that the comment is displayed
    await expect(detailsDialog.getByText("This is a test comment.", { exact: true })).toBeVisible();
    await expect(detailsDialog.getByTestId("author-comment")).toBeVisible();

    // Ensure fallback is not shown
    await expect(detailsDialog.getByText("No comments yet.", { exact: true })).toBeHidden();

    await page.getByRole("button", { name: "Close" }).click();
  });
});
