import { NextRequest, NextResponse } from "next/server";
import { updateJiraTaskForUser } from "@/services/jiraService";
import type { UpdateJiraTaskPayload } from "@/types/jira";

const DEMO_USER_ID = "00000000-0000-0000-0000-000000000001";

/**
 * PATCH /api/jira/projects/[projectKey]/issues/[issueIdOrKey] — Update a Jira issue in this project.
 * Body: { summary?, description?, priority?, assignee?, dueDate? }
 * Use null for priority, assignee, or dueDate to clear.
 */
export async function PATCH(
  request: NextRequest,
  {
    params,
  }: { params: Promise<{ projectKey: string; issueIdOrKey: string }> },
) {
  const { projectKey, issueIdOrKey } = await params;
  if (!projectKey || !issueIdOrKey) {
    return NextResponse.json(
      { error: "Missing projectKey or issueIdOrKey." },
      { status: 400 },
    );
  }

  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: "Invalid JSON body." }, { status: 400 });
  }

  const b = body as Record<string, unknown>;
  const payload: UpdateJiraTaskPayload = {};

  if (b.summary !== undefined) {
    if (typeof b.summary !== "string") {
      return NextResponse.json(
        { error: "Invalid body: summary must be a string." },
        { status: 400 },
      );
    }
    payload.summary = b.summary.trim();
  }
  if (b.description !== undefined) {
    if (typeof b.description !== "string" && b.description !== null) {
      return NextResponse.json(
        { error: "Invalid body: description must be a string or null." },
        { status: 400 },
      );
    }
    payload.description =
      typeof b.description === "string" ? b.description : undefined;
  }
  if (b.priority !== undefined) {
    if (typeof b.priority !== "string" && b.priority !== null) {
      return NextResponse.json(
        { error: "Invalid body: priority must be a string or null." },
        { status: 400 },
      );
    }
    payload.priority =
      b.priority === null || b.priority === ""
        ? null
        : typeof b.priority === "string"
          ? b.priority
          : undefined;
  }
  if (b.assignee !== undefined) {
    if (typeof b.assignee !== "string" && b.assignee !== null) {
      return NextResponse.json(
        {
          error: "Invalid body: assignee must be a string (accountId) or null.",
        },
        { status: 400 },
      );
    }
    payload.assignee =
      b.assignee === null || b.assignee === ""
        ? null
        : typeof b.assignee === "string"
          ? b.assignee
          : undefined;
  }
  if (b.dueDate !== undefined) {
    if (typeof b.dueDate !== "string" && b.dueDate !== null) {
      return NextResponse.json(
        { error: "Invalid body: dueDate must be an ISO string or null." },
        { status: 400 },
      );
    }
    payload.dueDate =
      b.dueDate === null || b.dueDate === ""
        ? null
        : typeof b.dueDate === "string"
          ? b.dueDate
          : undefined;
  }

  if (Object.keys(payload).length === 0) {
    return NextResponse.json(
      {
        error:
          "No fields to update. Send at least one of summary, description, priority, assignee, dueDate.",
      },
      { status: 400 },
    );
  }

  try {
    const issue = await updateJiraTaskForUser(
      DEMO_USER_ID,
      issueIdOrKey,
      payload,
    );
    if (issue.key && !issue.key.startsWith(projectKey)) {
      return NextResponse.json(
        { error: "Issue does not belong to this project." },
        { status: 400 },
      );
    }
    return NextResponse.json(issue);
  } catch (error) {
    const message = error instanceof Error ? error.message : "";
    if (message === "No active Jira connection found for user.") {
      return NextResponse.json(
        { error: "No active Jira connection." },
        { status: 401 },
      );
    }
    console.error("Failed to update Jira issue:", error);
    return NextResponse.json(
      { error: "Failed to update Jira issue." },
      { status: 500 },
    );
  }
}
