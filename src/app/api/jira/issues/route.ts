import { NextRequest, NextResponse } from "next/server";
import {
  getJiraIssuesForProject,
  createJiraTaskForUser,
} from "@/services/jiraService";
import type { CreateJiraTaskPayload, JiraIssueFilters } from "@/types/jira";
import { JiraClientError } from "@/platforms/jira/JiraAdapter";

const DEMO_USER_ID = "00000000-0000-0000-0000-000000000001";

/**
 * Parses optional filter query params (status, priority, assignee).
 * Uses getAll() so multiple values are supported (e.g. ?status=Done&status=In Progress).
 * Returns undefined when no filters are present so the service can skip JQL filter clauses.
 */
function getFiltersFromRequest(request: NextRequest): JiraIssueFilters | undefined {
  const searchParams = request.nextUrl.searchParams;
  const status = searchParams.getAll("status").filter((s) => s.trim() !== "");
  const priority = searchParams.getAll("priority").filter((p) => p.trim() !== "");
  const assignee = searchParams.getAll("assignee").filter((a) => a.trim() !== "");

  if (status.length === 0 && priority.length === 0 && assignee.length === 0) {
    return undefined;
  }
  return {
    ...(status.length > 0 && { status }),
    ...(priority.length > 0 && { priority }),
    ...(assignee.length > 0 && { assignee }),
  };
}

export async function GET(request: NextRequest) {
  const projectKey = request.nextUrl.searchParams.get("projectKey");
  const cursor = request.nextUrl.searchParams.get("cursor") ?? undefined;
  const filters = getFiltersFromRequest(request);

  try {
    if (projectKey != null && projectKey !== "") {
      const result = await getJiraIssuesForProject(
        DEMO_USER_ID,
        projectKey.trim(),
        cursor?.trim() || undefined,
        filters,
      );
      return NextResponse.json(result);
    }
  } catch (error) {
    const message = error instanceof Error ? error.message : "";
    if (message === "No active Jira connection found for user.") {
      return NextResponse.json(
        { error: "No active Jira connection." },
        { status: 401 },
      );
    }
    console.error("Failed to fetch Jira issues:", error);
    return NextResponse.json(
      { error: "Failed to search issues." },
      { status: 500 },
    );
  }
}

/**
 * Create a Jira issue for the current user.
 * Body: { projectId, issueTypeId, summary, description?, priority?, assignee?, dueDate?, parentIssueKey? }
 */
export async function POST(request: NextRequest) {
  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json(
      { error: "Invalid JSON body." },
      { status: 400 },
    );
  }

  const { projectId, issueTypeId, summary, description, priority, assignee, dueDate, parentIssueKey } =
    body as Record<string, unknown>;
  if (typeof projectId !== "string" || !projectId) {
    return NextResponse.json(
      { error: "Missing or invalid body field: projectId (string)." },
      { status: 400 },
    );
  }
  if (typeof issueTypeId !== "string" || !issueTypeId) {
    return NextResponse.json(
      { error: "Missing or invalid body field: issueTypeId (string)." },
      { status: 400 },
    );
  }
  if (typeof summary !== "string" || !summary.trim()) {
    return NextResponse.json(
      { error: "Missing or invalid body field: summary (non-empty string)." },
      { status: 400 },
    );
  }

  if (priority != null && typeof priority !== "string") {
    return NextResponse.json(
      { error: "Invalid body field: priority (string)." },
      { status: 400 },
    );
  }
  if (assignee != null && typeof assignee !== "string") {
    return NextResponse.json(
      { error: "Invalid body field: assignee (string accountId)." },
      { status: 400 },
    );
  }
  if (dueDate != null && typeof dueDate !== "string") {
    return NextResponse.json(
      { error: "Invalid body field: dueDate (ISO string)." },
      { status: 400 },
    );
  }
  if (parentIssueKey != null && typeof parentIssueKey !== "string") {
    return NextResponse.json(
      { error: "Invalid body field: parentIssueKey (string)." },
      { status: 400 },
    );
  }
  if (typeof dueDate === "string" && dueDate.trim()) {
    const trimmed = dueDate.trim();
    const isYmd = /^\d{4}-\d{2}-\d{2}/.test(trimmed);
    const d = new Date(trimmed);
    if (!isYmd && Number.isNaN(d.getTime())) {
      return NextResponse.json(
        { error: "Invalid body field: dueDate (expected ISO date/datetime string)." },
        { status: 400 },
      );
    }
  }

  const payload: CreateJiraTaskPayload = {
    projectId,
    issueTypeId,
    summary: summary.trim(),
    ...(typeof description === "string" && { description: description.trim() || undefined }),
    ...(typeof priority === "string" && { priority: priority.trim() || undefined }),
    ...(typeof assignee === "string" && { assignee: assignee.trim() || undefined }),
    ...(typeof dueDate === "string" && { dueDate: dueDate.trim() || undefined }),
    ...(typeof parentIssueKey === "string" && parentIssueKey.trim() && { parentIssueKey: parentIssueKey.trim() }),
  };

  try {
    const task = await createJiraTaskForUser(DEMO_USER_ID, payload);
    return NextResponse.json(task);
  } catch (error) {
    const message = error instanceof Error ? error.message : "";
    if (message === "No active Jira connection found for user.") {
      return NextResponse.json({ error: "No active Jira connection." }, { status: 401 });
    }
    if (error instanceof JiraClientError) {
      return NextResponse.json({ error: error.message }, { status: error.statusCode });
    }
    console.error("Failed to create Jira issue:", error);
    return NextResponse.json(
      { error: "Failed to create Jira issue." },
      { status: 500 },
    );
  }
}
