// Developer setup guide — only reachable in NODE_ENV=development.
// Lists implementation status for every route and adapter method so the
// DevSetupPanel in the UI can show an actionable checklist.
export const dynamic = "force-dynamic";

import fs from "node:fs";
import path from "node:path";

import type { SetupStatusResponse, SetupStep } from "@mp/ui";
import { NextResponse } from "next/server";

// process.cwd() is apps/<platform>/ when run via `nx serve`.
const CWD = process.cwd();

function readFileContent(relPath: string): string | null {
  const abs = path.join(CWD, relPath);
  if (!fs.existsSync(abs)) return null;
  return fs.readFileSync(abs, "utf-8");
}

/** Primary signal: explicit `// TODO:` markers left by the generator. */
function fileStatus(relPath: string): "complete" | "not-started" | "missing" {
  const content = readFileContent(relPath);
  if (content === null) return "missing";
  return /\/\/ TODO:/m.test(content) ? "not-started" : "complete";
}

/** Mapping files may need manual work without `// TODO:` (transform stubs or hand-maintained headers). */
function mappingFileStatus(relPath: string): "complete" | "not-started" | "missing" {
  const content = readFileContent(relPath);
  if (content === null) return "missing";
  if (/\/\/ TODO: implement transform/m.test(content)) return "not-started";
  if (/\/\/ TODO:/m.test(content)) return "not-started";
  return "complete";
}

function todoCount(relPath: string): number {
  const content = readFileContent(relPath);
  if (content === null) return 0;
  return (content.match(/\/\/ TODO:/g) ?? []).length;
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

  const auth = `src/app/api/auth/wrike`;
  const api = `src/app/api/wrike`;

  const steps: SetupStep[] = [
    // ── 1. Environment variables ──────────────────────────────────────────
    {
      id: "env-vars",
      group: "Setup",
      label: "Environment variables",
      description: "Credentials and Azure PostgreSQL required to run the app",
      status: envStatus([
        "WRIKE_CLIENT_ID",
        "WRIKE_CLIENT_SECRET",
        "WRIKE_REDIRECT_URI",
        "DATABASE_URL",
      ]),
      filePath: ".env.local",
      vscodePath: vscodePath(".env.local"),
      hint: "Copy .env.example and fill in your Wrike credentials and DATABASE_URL.",
      blockedBy: [],
    },

    // ── 2. Auth ───────────────────────────────────────────────────────────
    {
      id: "auth-connect",
      group: "Auth",
      label: "Connect endpoint",
      description: "Redirect users to the Wrike authorization page",
      status: fileStatus(`${auth}/connect/route.ts`),
      filePath: `${auth}/connect/route.ts`,
      vscodePath: vscodePath(`${auth}/connect/route.ts`),
      hint: "Build the authorization URL with authStrategy and redirect the user.",
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
      hint: "Call authStrategy.refresh() and return the new token data.",
      todoCount: todoCount(`${auth}/refresh/route.ts`),
      blockedBy: ["auth-callback"],
    },

    // ── 3. Service adapter ────────────────────────────────────────────────
    {
      id: "service-adapter",
      group: "Adapter",
      label: "WrikeServiceAdapter",
      description: "Platform adapter that all API routes delegate to",
      status: fileStatus(`src/platforms/WrikeServiceAdapter.ts`),
      filePath: `src/platforms/WrikeServiceAdapter.ts`,
      vscodePath: vscodePath(`src/platforms/WrikeServiceAdapter.ts`),
      hint: "Implement getProjects(), getTasks(), getTask(), createTask(), updateTask(), deleteTask(), and getProjectStatuses().",
      todoCount: todoCount(`src/platforms/WrikeServiceAdapter.ts`),
      blockedBy: ["auth-refresh"],
    },
    {
      id: "http-adapter",
      group: "Adapter",
      label: "WrikeAdapter (HTTP)",
      description: "Raw REST client — endpoints, auth headers, response unwrapping",
      status: fileStatus(`src/platforms/wrike/WrikeAdapter.ts`),
      filePath: `src/platforms/wrike/WrikeAdapter.ts`,
      vscodePath: vscodePath(`src/platforms/wrike/WrikeAdapter.ts`),
      hint: "Fill in each API method using the platform docs. Check optional ?fields rules per endpoint.",
      todoCount: todoCount(`src/platforms/wrike/WrikeAdapter.ts`),
      blockedBy: ["service-adapter"],
    },
    {
      id: "platform-types",
      group: "Adapter",
      label: "Platform API types",
      description: "Raw API shapes in src/types/wrike.ts",
      status: fileStatus(`src/types/wrike.ts`),
      filePath: `src/types/wrike.ts`,
      vscodePath: vscodePath(`src/types/wrike.ts`),
      hint: "Replace stub fields with real properties from the platform API reference.",
      todoCount: todoCount(`src/types/wrike.ts`),
      blockedBy: ["http-adapter"],
    },
    {
      id: "task-mappings",
      group: "Adapter",
      label: "Task field mappings",
      description: "normalizeTask() — may need hand-maintained ID resolution",
      status: mappingFileStatus(`src/platforms/wrike/generated/tasks.mapping.ts`),
      filePath: `src/platforms/wrike/generated/tasks.mapping.ts`,
      vscodePath: vscodePath(`src/platforms/wrike/generated/tasks.mapping.ts`),
      hint: "Run generate-mappings, then implement transform TODOs or replace with a hand-maintained file (see Wrike).",
      todoCount: todoCount(`src/platforms/wrike/generated/tasks.mapping.ts`),
      blockedBy: ["platform-types"],
    },

    // ── 4. Core data routes ───────────────────────────────────────────────
    {
      id: "projects",
      group: "Data",
      label: "Projects",
      description: "List boards / projects for the connected user",
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
      description: "Paginated task list for the selected project",
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
      description: "Get, update, and delete a specific task",
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

    // ── 5. Capability-gated routes ─────────────────────────────────────────
    {
      id: "transitions",
      group: "Task Actions",
      label: "Status transitions",
      description: "Move a task through available status stages",
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
      description: "Thread of comments on a task",
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
      description: "Available priority options for the priority picker",
      status: fileStatus(`${api}/project-priorities/route.ts`),
      filePath: `${api}/project-priorities/route.ts`,
      vscodePath: vscodePath(`${api}/project-priorities/route.ts`),
      hint: "Call adapter.getPriorities() and return the array.",
      todoCount: todoCount(`${api}/project-priorities/route.ts`),
      blockedBy: ["projects"],
    },
    {
      id: "current-user",
      group: "Task Actions",
      label: "Current user",
      description: "Profile for assignee picker defaults",
      status: fileStatus(`${api}/current-user/route.ts`),
      filePath: `${api}/current-user/route.ts`,
      vscodePath: vscodePath(`${api}/current-user/route.ts`),
      hint: "Delegates to adapter.getCurrentUser() — implement on the service adapter if missing.",
      todoCount: todoCount(`${api}/current-user/route.ts`),
      blockedBy: ["service-adapter"],
    },
    {
      id: "issue-attachments-upload",
      group: "Task Actions",
      label: "Upload attachments",
      description: "POST multipart upload for a task",
      status: fileStatus(`${api}/issues/[issueIdOrKey]/attachments/route.ts`),
      filePath: `${api}/issues/[issueIdOrKey]/attachments/route.ts`,
      vscodePath: vscodePath(`${api}/issues/[issueIdOrKey]/attachments/route.ts`),
      hint: "Implement POST handler calling adapter.addAttachment().",
      todoCount: todoCount(`${api}/issues/[issueIdOrKey]/attachments/route.ts`),
      blockedBy: ["issue-detail"],
    },
    {
      id: "select-project",
      group: "Connection",
      label: "Persist selected project",
      description: "Stores the user's default folder/project on the connection",
      status: fileStatus(`${api}/select-project/route.ts`),
      filePath: `${api}/select-project/route.ts`,
      vscodePath: vscodePath(`${api}/select-project/route.ts`),
      hint: "Call tokenStore.updateProject(userId, projectKey).",
      todoCount: todoCount(`${api}/select-project/route.ts`),
      blockedBy: ["projects"],
    },
  ];

  const response: SetupStatusResponse = {
    platform: "wrike",
    displayName: "Wrike",
    steps,
  };

  return NextResponse.json(response);
}
