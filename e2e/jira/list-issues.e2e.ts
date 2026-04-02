import { expect, test } from "@playwright/test";

type Issue = {
  id: string;
  key: string;
  fields: {
    summary: string;
    status: { id: string; name: string; statusCategory: { key: string } };
    priority?: { id: string; name: string; iconUrl?: string };
    assignee?: { accountId: string; displayName: string; avatarUrls?: Record<string, string> };
  };
};

function uniqByKey<T extends { key: string }>(items: T[]): T[] {
  const seen = new Set<string>();
  return items.filter((i) => {
    if (seen.has(i.key)) return false;
    seen.add(i.key);
    return true;
  });
}

const installApiMocks = async (page: import("@playwright/test").Page) => {
  await page.route("**/api/auth/jira/status", async (route) => {
    await route.fulfill({
      status: 200,
      contentType: "application/json",
      body: JSON.stringify({ connected: true }),
    });
  });

  await page.route("**/api/jira/sites", async (route) => {
    await route.fulfill({
      status: 200,
      contentType: "application/json",
      body: JSON.stringify({
        resources: [{ id: "cloud-1", url: "https://example.atlassian.net", name: "Example Site" }],
        selectedSite: "cloud-1",
      }),
    });
  });

  const projects = [
    { id: "10001", key: "DEMO", name: "Demo Project" },
    { id: "10002", key: "EMPTY", name: "Empty Project" },
    { id: "10003", key: "BAD", name: "Broken Project" },
  ];
  await page.route("**/api/jira/projects", async (route) => {
    await route.fulfill({
      status: 200,
      contentType: "application/json",
      body: JSON.stringify(projects),
    });
  });

  await page.route("**/api/jira/project-priorities", async (route) => {
    await route.fulfill({
      status: 200,
      contentType: "application/json",
      body: JSON.stringify([
        { id: "pri-high", name: "High", iconUrl: "" },
        { id: "pri-low", name: "Low", iconUrl: "" },
      ]),
    });
  });

  await page.route("**/api/jira/current-user", async (route) => {
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

  await page.route("**/api/jira/assignees**", async (route) => {
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

  await page.route("**/api/jira/statuses/**", async (route) => {
    await route.fulfill({
      status: 200,
      contentType: "application/json",
      body: JSON.stringify([
        {
          projectId: "10001",
          projectKey: "DEMO",
          statuses: [
            { id: "st-todo", name: "To Do", statusCategory: { key: "new" } },
            { id: "st-done", name: "Done", statusCategory: { key: "done" } },
          ],
        },
      ]),
    });
  });

  const allIssues: Issue[] = [
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

  await page.route("**/api/jira/issues**", async (route) => {
    const url = new URL(route.request().url());
    const projectKey = url.searchParams.get("projectKey") ?? "";

    if (projectKey === "BAD") {
      await route.fulfill({
        status: 500,
        contentType: "application/json",
        body: JSON.stringify({ error: "Failed to search issues." }),
      });
      return;
    }

    if (projectKey === "EMPTY") {
      await route.fulfill({
        status: 200,
        contentType: "application/json",
        body: JSON.stringify({ issues: [], nextPageToken: null, isLast: true }),
      });
      return;
    }

    // Simulate brief loading state on first load.
    await new Promise((r) => setTimeout(r, 150));

    const status = url.searchParams.getAll("status");
    const priority = url.searchParams.getAll("priority");
    const assignee = url.searchParams.getAll("assignee");

    let filtered = [...allIssues];
    if (status.length > 0) filtered = filtered.filter((i) => status.includes(i.fields.status.id));
    if (priority.length > 0)
      filtered = filtered.filter(
        (i) => i.fields.priority && priority.includes(i.fields.priority.id),
      );
    if (assignee.length > 0) {
      filtered = filtered.filter((i) => {
        const accountId = i.fields.assignee?.accountId ?? "unassigned";
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
};

test.describe("List Tasks", () => {
  test("lists tasks for a selected project", async ({ page }) => {
    await installApiMocks(page);

    // Step 1: Ensure Jira is connected
    await page.goto("/task-manager-extension");
    await expect(page.getByText("Connected to Jira")).toBeVisible();

    // Step 2: Open project picker/selector
    await page.getByLabel("Select a project").click();
    await expect(page.getByText("Demo Project")).toBeVisible();
    await expect(page.getByText("Empty Project")).toBeVisible();
    await expect(page.getByText("Broken Project")).toBeVisible();

    // Step 3: Select a project with issues.
    // Loading appears briefly
    await page.getByText("Demo Project").click();
    await expect(page.getByText("Loading tasks…")).toBeVisible();

    // Step 4/5: Wait for list to load and verify content (key, title, status, priority)
    const row1 = page.getByRole("button", { name: /DEMO-1/ });
    await expect(row1.getByText("DEMO-1")).toBeVisible();
    await expect(row1.getByText("First task")).toBeVisible();
    await expect(row1.getByText("To Do")).toBeVisible();
    await expect(row1.getByText("High")).toBeVisible();

    const row2 = page.getByRole("button", { name: /DEMO-2/ });
    await expect(row2.getByText("DEMO-2")).toBeVisible();
    await expect(row2.getByText("Second task")).toBeVisible();
    await expect(row2.getByText("Done")).toBeVisible();
    await expect(row2.getByText("Low")).toBeVisible();
  });

  test("edge case: selecting a project with no issues shows empty state", async ({ page }) => {
    await installApiMocks(page);

    await page.goto("/task-manager-extension");
    await page.getByLabel("Select a project").click();
    await page.getByText("Empty Project").click();

    await expect(page.getByText("No tasks in this project yet")).toBeVisible();
    await expect(
      page.getByText("Could not load tasks. Check your connection and try again."),
    ).toHaveCount(0);
  });

  test("edge case: invalid/unavailable project shows an error message", async ({ page }) => {
    await installApiMocks(page);

    await page.goto("/task-manager-extension");
    await page.getByLabel("Select a project").click();
    await page.getByText("Broken Project").click();

    await expect(
      page.getByText("Could not load tasks. Check your connection and try again."),
    ).toBeVisible();
  });
});
