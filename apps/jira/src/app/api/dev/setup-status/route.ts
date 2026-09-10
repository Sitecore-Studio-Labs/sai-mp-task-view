// Developer setup guide — only reachable in NODE_ENV=development.
export const dynamic = "force-dynamic";

import fs from "node:fs";
import path from "node:path";

import type { SetupStatusResponse, SetupStep } from "@mp/ui";
import { NextResponse } from "next/server";

const CWD = process.cwd();

function fileStatus(relPath: string): "complete" | "not-started" | "missing" {
  const abs = path.join(CWD, relPath);
  if (!fs.existsSync(abs)) return "missing";
  const content = fs.readFileSync(abs, "utf-8");
  return /\/\/ TODO:/m.test(content) ? "not-started" : "complete";
}

function todoCount(relPath: string): number {
  const abs = path.join(CWD, relPath);
  if (!fs.existsSync(abs)) return 0;
  return (fs.readFileSync(abs, "utf-8").match(/\/\/ TODO:/g) ?? []).length;
}

function envStatus(vars: string[]): "complete" | "not-started" | "missing" {
  const missing = vars.filter((v) => !process.env[v]);
  if (missing.length === 0) return "complete";
  return missing.length === vars.length ? "missing" : "not-started";
}

function vscodePath(relPath: string): string {
  return `cursor://file/${path.join(CWD, relPath).replace(/\\/g, "/")}`;
}

export async function GET(): Promise<NextResponse> {
  if (process.env.NODE_ENV !== "development") {
    return NextResponse.json({ error: "Not available" }, { status: 404 });
  }

  const auth = `src/app/api/auth/jira`;
  const api = `src/app/api/jira`;

  const steps: SetupStep[] = [
    {
      id: "env-vars",
      group: "Setup",
      label: "Environment variables",
      description:
        "Credentials, Azure PostgreSQL, and remaining Supabase keys required to run the app",
      status: envStatus([
        "JIRA_CLIENT_ID",
        "JIRA_CLIENT_SECRET",
        "JIRA_REDIRECT_URI",
        "DATABASE_URL",
        "NEXT_PUBLIC_SUPABASE_URL",
        "SUPABASE_SERVICE_ROLE_KEY",
      ]),
      filePath: ".env.local",
      vscodePath: vscodePath(".env.local"),
      hint: "Copy .env.example and fill in your Jira OAuth credentials, DATABASE_URL, and remaining Supabase keys.",
      blockedBy: [],
    },
    {
      id: "auth-connect",
      group: "Auth",
      label: "Connect endpoint",
      description: "Redirect users to the Jira OAuth authorization page",
      status: fileStatus(`${auth}/connect/route.ts`),
      filePath: `${auth}/connect/route.ts`,
      vscodePath: vscodePath(`${auth}/connect/route.ts`),
      hint: "Build the Atlassian authorization URL using authStrategy and redirect the user.",
      todoCount: todoCount(`${auth}/connect/route.ts`),
      blockedBy: ["env-vars"],
    },
    {
      id: "auth-callback",
      group: "Auth",
      label: "Callback endpoint",
      description: "Exchange the authorization code for access and refresh tokens",
      status: fileStatus(`${auth}/callback/route.ts`),
      filePath: `${auth}/callback/route.ts`,
      vscodePath: vscodePath(`${auth}/callback/route.ts`),
      hint: "Call authStrategy.handleCallback() with the code from the query string, then redirect.",
      todoCount: todoCount(`${auth}/callback/route.ts`),
      blockedBy: ["auth-connect"],
    },
    {
      id: "auth-refresh",
      group: "Auth",
      label: "Token refresh endpoint",
      description: "Silently refresh expired access tokens",
      status: fileStatus(`${auth}/refresh/route.ts`),
      filePath: `${auth}/refresh/route.ts`,
      vscodePath: vscodePath(`${auth}/refresh/route.ts`),
      hint: "Call authStrategy.refresh() — Atlassian uses rotating refresh tokens.",
      todoCount: todoCount(`${auth}/refresh/route.ts`),
      blockedBy: ["auth-callback"],
    },
    {
      id: "service-adapter",
      group: "Adapter",
      label: "JiraServiceAdapter",
      description: "Platform adapter that all API routes delegate to",
      status: fileStatus("src/platforms/JiraServiceAdapter.ts"),
      filePath: "src/platforms/JiraServiceAdapter.ts",
      vscodePath: vscodePath("src/platforms/JiraServiceAdapter.ts"),
      hint: "Implement all methods from PlatformServiceAdapter.",
      todoCount: todoCount("src/platforms/JiraServiceAdapter.ts"),
      blockedBy: ["auth-refresh"],
    },
    {
      id: "projects",
      group: "Data",
      label: "Projects",
      description: "List Jira projects for the connected site",
      status: fileStatus(`${api}/projects/route.ts`),
      filePath: `${api}/projects/route.ts`,
      vscodePath: vscodePath(`${api}/projects/route.ts`),
      hint: "Call adapter.getProjects() and return the array.",
      todoCount: todoCount(`${api}/projects/route.ts`),
      blockedBy: ["service-adapter"],
    },
    {
      id: "issues",
      group: "Data",
      label: "Issues / tasks list",
      description: "Paginated issue list for the selected project",
      status: fileStatus(`${api}/issues/route.ts`),
      filePath: `${api}/issues/route.ts`,
      vscodePath: vscodePath(`${api}/issues/route.ts`),
      hint: "Implement GET (getTasks) and POST (createTask) handlers.",
      todoCount: todoCount(`${api}/issues/route.ts`),
      blockedBy: ["projects"],
    },
    {
      id: "issue-detail",
      group: "Data",
      label: "Issue detail",
      description: "Get, update, and delete a specific issue",
      status: fileStatus(`${api}/issues/[issueIdOrKey]/route.ts`),
      filePath: `${api}/issues/[issueIdOrKey]/route.ts`,
      vscodePath: vscodePath(`${api}/issues/[issueIdOrKey]/route.ts`),
      hint: "Implement GET (getTask), PATCH (updateTask), and DELETE (deleteTask).",
      todoCount: todoCount(`${api}/issues/[issueIdOrKey]/route.ts`),
      blockedBy: ["issues"],
    },
    {
      id: "statuses",
      group: "Data",
      label: "Project statuses",
      description: "Available statuses for the status picker",
      status: fileStatus(`${api}/statuses/[projectKey]/route.ts`),
      filePath: `${api}/statuses/[projectKey]/route.ts`,
      vscodePath: vscodePath(`${api}/statuses/[projectKey]/route.ts`),
      hint: "Call adapter.getProjectStatuses(projectKey) and return the array.",
      todoCount: todoCount(`${api}/statuses/[projectKey]/route.ts`),
      blockedBy: ["projects"],
    },
    {
      id: "sites",
      group: "Connection",
      label: "Sites",
      description: "Atlassian cloud site selection before connecting",
      status: fileStatus(`${api}/sites/route.ts`),
      filePath: `${api}/sites/route.ts`,
      vscodePath: vscodePath(`${api}/sites/route.ts`),
      hint: "Return accessible Atlassian sites for the user to select.",
      todoCount: todoCount(`${api}/sites/route.ts`),
      blockedBy: ["auth-callback"],
    },
    {
      id: "transitions",
      group: "Task Actions",
      label: "Status transitions",
      description: "Move an issue through Jira workflow stages",
      status: fileStatus(`${api}/issues/[issueIdOrKey]/transitions/route.ts`),
      filePath: `${api}/issues/[issueIdOrKey]/transitions/route.ts`,
      vscodePath: vscodePath(`${api}/issues/[issueIdOrKey]/transitions/route.ts`),
      hint: "Implement GET (getTransitions) and POST (changeStatus).",
      todoCount: todoCount(`${api}/issues/[issueIdOrKey]/transitions/route.ts`),
      blockedBy: ["issue-detail"],
    },
    {
      id: "assignees",
      group: "Task Actions",
      label: "Assignees",
      description: "User search for the assignee picker",
      status: fileStatus(`${api}/assignees/route.ts`),
      filePath: `${api}/assignees/route.ts`,
      vscodePath: vscodePath(`${api}/assignees/route.ts`),
      hint: "Implement GET to return user search results via adapter.getAssignees().",
      todoCount: todoCount(`${api}/assignees/route.ts`),
      blockedBy: ["projects"],
    },
    {
      id: "comments",
      group: "Task Actions",
      label: "Comments",
      description: "ADF comment thread on an issue",
      status: fileStatus(`${api}/comments/route.ts`),
      filePath: `${api}/comments/route.ts`,
      vscodePath: vscodePath(`${api}/comments/route.ts`),
      hint: "Implement GET (getComments) and POST (createComment).",
      todoCount: todoCount(`${api}/comments/route.ts`),
      blockedBy: ["issue-detail"],
    },
    {
      id: "attachments",
      group: "Task Actions",
      label: "Attachments",
      description: "View and remove file attachments",
      status: fileStatus(`${api}/attachment/[attachmentId]/route.ts`),
      filePath: `${api}/attachment/[attachmentId]/route.ts`,
      vscodePath: vscodePath(`${api}/attachment/[attachmentId]/route.ts`),
      hint: "Implement GET (getAttachmentContent) and DELETE (deleteAttachment).",
      todoCount: todoCount(`${api}/attachment/[attachmentId]/route.ts`),
      blockedBy: ["issue-detail"],
    },
    {
      id: "priorities",
      group: "Task Actions",
      label: "Priorities",
      description: "Available priority options",
      status: fileStatus(`${api}/project-priorities/route.ts`),
      filePath: `${api}/project-priorities/route.ts`,
      vscodePath: vscodePath(`${api}/project-priorities/route.ts`),
      hint: "Call adapter.getPriorities() and return the array.",
      todoCount: todoCount(`${api}/project-priorities/route.ts`),
      blockedBy: ["projects"],
    },
    {
      id: "issue-types",
      group: "Task Actions",
      label: "Issue types",
      description: "Issue type options for the type picker",
      status: fileStatus(`${api}/issue-types/route.ts`),
      filePath: `${api}/issue-types/route.ts`,
      vscodePath: vscodePath(`${api}/issue-types/route.ts`),
      hint: "Call adapter.getIssueTypes(projectId) and return the array.",
      todoCount: todoCount(`${api}/issue-types/route.ts`),
      blockedBy: ["projects"],
    },
  ];

  const response: SetupStatusResponse = {
    platform: "jira",
    displayName: "Jira",
    steps,
  };

  return NextResponse.json(response);
}
