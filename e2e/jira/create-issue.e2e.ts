import { expect, type Page, test } from "@playwright/test";

import { JiraIssue, JiraIssueType } from "@/types/jira";

import { installExtensionSetupCompleteMocks } from "../helpers/mockExtensionSetupComplete";
import { selectTaskManagerJiraProject } from "../helpers/selectTaskManagerProject";

const installApiMocks = async (page: Page, hasPermission: boolean) => {
  await installExtensionSetupCompleteMocks(page);
  const issueTypes: JiraIssueType[] = [
    { id: "10001", name: "Task" },
    { id: "10002", name: "Sub-task" },
  ];

  let nextIssueNumber = 2;
  const project = { id: "100", key: "PROJ", name: "Project One" };
  const status = {
    id: "1",
    name: "To Do",
    description: "",
    statusCategory: { id: "2", key: "new", name: "To Do" },
  };

  const issues: JiraIssue[] = [
    {
      id: "1",
      key: "PROJ-1",
      fields: {
        summary: "Seed issue (parent candidate)",
        status,
        project,
        issuetype: { id: "10001", name: "Task" },
      },
    },
  ];

  const apiJson = async (urlEndsWithPath: string, body: unknown, statusCode = 200) => {
    await page.route(`**/api${urlEndsWithPath}**`, async (route) => {
      await route.fulfill({
        status: statusCode,
        contentType: "application/json",
        body: JSON.stringify(body),
      });
    });
  };

  await apiJson("/auth/jira/status", { connected: true });
  await apiJson("/jira/sites", {
    resources: [{ id: "cloud-1", url: "https://example.atlassian.net", name: "Example Site" }],
    selectedSite: "cloud-1",
  });
  await apiJson("/jira/projects", [project]);
  await apiJson("/jira/issue-types", issueTypes);
  await apiJson("/jira/priorities", []);
  await apiJson("/jira/current-user", {
    accountId: "u1",
    displayName: "E2E User",
    avatarUrls: { "24x24": "https://example.com/avatar.png" },
  });
  await apiJson("/jira/assignees", []);
  await apiJson("/jira/permissions", { hasPermission });

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

  await page.route("**/api/jira/issues**", async (route) => {
    const req = route.request();

    if (req.method() === "GET") {
      await route.fulfill({
        status: 200,
        contentType: "application/json",
        body: JSON.stringify({ issues, isLast: true }),
      });
      return;
    }

    if (req.method() === "POST") {
      const payload = (await req.postDataJSON()) as {
        projectId: string;
        issueTypeId: string;
        summary: string;
        description?: string;
        priority?: string;
        parentIssueKey?: string;
      };

      const issueType = issueTypes.find((t) => t.id === payload.issueTypeId) ?? issueTypes[0];
      const key = `PROJ-${nextIssueNumber++}`;

      const createdIssue: JiraIssue = {
        id: String(Date.now()),
        key,
        fields: {
          summary: payload.summary,
          status,
          project,
          issuetype: { id: issueType.id, name: issueType.name },
          ...(payload.parentIssueKey
            ? {
                parent: (() => {
                  const p = issues.find((i) => i.key === payload.parentIssueKey);
                  return p
                    ? {
                        id: p.id,
                        key: p.key,
                        summary: p.fields.summary,
                        issueType: {
                          name: p.fields.issuetype.name,
                          iconUrl: p.fields.issuetype.iconUrl,
                        },
                      }
                    : undefined;
                })(),
              }
            : {}),
        },
      };
      issues.unshift(createdIssue);

      await route.fulfill({
        status: 200,
        contentType: "application/json",
        body: JSON.stringify({
          id: createdIssue.id,
          key: createdIssue.key,
          self: "https://example.atlassian.net/rest/api/3/issue/1",
          summary: createdIssue.fields.summary,
          projectId: payload.projectId,
          projectKey: project.key,
          issueTypeId: issueType.id,
          issueTypeName: issueType.name,
        }),
      });
      return;
    }

    await route.fulfill({ status: 405 });
  });

  return { project, issues };
};

test.describe("Jira - Create Issue", () => {
  test("should disable create task button when don't have create permissions", async ({ page }) => {
    const { project } = await installApiMocks(page, false);

    await page.goto("/task-manager-extension");

    await selectTaskManagerJiraProject(page, project.name);
    await expect(page.getByRole("button", { name: "Create" })).toBeDisabled();
  });

  test("should have able to  create a task", async ({ page }) => {
    const { project } = await installApiMocks(page, true);

    await page.goto("/task-manager-extension");

    await selectTaskManagerJiraProject(page, project.name);
    await page.getByRole("button", { name: "Create" }).click();

    await expect(page.getByRole("form", { name: "Create task" })).toBeVisible();

    await page.getByLabel("Issue Type").click();
    await page.getByRole("option", { name: "Task", exact: true }).click();
    await page.getByLabel("Summary *").fill("E2E - New Task");

    const createTaskBtn = page.getByRole("button", { name: "Create Task" });
    await expect(createTaskBtn).toBeVisible({ timeout: 5000 });
    await createTaskBtn.click();

    // Ensure new item appears in list.
    await expect(page.getByRole("button", { name: "Create" })).toBeVisible();
    await expect(page.getByText("E2E - New Task", { exact: true })).toBeVisible();
  });
});
