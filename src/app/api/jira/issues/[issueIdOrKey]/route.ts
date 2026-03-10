import { NextRequest, NextResponse } from "next/server";
import {
  deleteJiraIssue,
  getDetailsForIssue,
  updateJiraTaskForUser,
} from "@/services/jiraService";
import type { UpdateJiraTaskPayload } from "@/types/jira";
import { JiraAuthError } from "@/exceptions/jiraErrors";
import { clearJiraCookie } from "@/helpers/cookies";

/**
 * GET /api/jira/issues/[issueIdOrKey] — Fetch a Jira issue by id or key.
 */
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ issueIdOrKey: string }> },
) {
  const userId = request.cookies.get("jira_user_id")?.value || "";
  try {
    const resolvedParams = await params;
    const issueIdOrKey = resolvedParams.issueIdOrKey;

    const issue = await getDetailsForIssue(userId, issueIdOrKey);

    return NextResponse.json(issue);
  } catch (error) {
    if (error instanceof JiraAuthError) {
      await clearJiraCookie();
      return NextResponse.json({ error: error.message }, { status: 401 });
    }
    const message = error instanceof Error ? error.message : "";
    if (message === "No active Jira connection found for user.") {
      await clearJiraCookie();
      return NextResponse.json(
        { error: "No active Jira connection." },
        { status: 401 },
      );
    }
    console.error("Failed to load Jira issue:", error);
    return NextResponse.json(
      { error: "Failed to load Jira issue.", details: error },
      { status: 500 },
    );
  }
}

/**
 * PATCH /api/jira/issues/[issueIdOrKey] — Update a Jira issue.
 * Body: { summary?, description?, issueType?, priority?, assignee?, dueDate? }
 * Use null for priority, assignee, or dueDate to clear.
 */
export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ issueIdOrKey: string }> },
) {
  const { issueIdOrKey } = await params;
  const userId = request.cookies.get("jira_user_id")?.value || "";
  if (!issueIdOrKey) {
    return NextResponse.json(
      { error: "Missing issueIdOrKey." },
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
  if (b.issueType !== undefined) {
    if (typeof b.issueType !== "string" && b.issueType !== null) {
      return NextResponse.json(
        { error: "Invalid body: issueType must be a string (id) or null." },
        { status: 400 },
      );
    }
    payload.issueType =
      b.issueType === null || b.issueType === ""
        ? null
        : typeof b.issueType === "string"
          ? b.issueType
          : undefined;
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
          "No fields to update. Send at least one of summary, description, issueType, priority, assignee, dueDate.",
      },
      { status: 400 },
    );
  }

  try {
    const issue = await updateJiraTaskForUser(
      userId,
      issueIdOrKey,
      payload,
    );
    return NextResponse.json(issue);
  } catch (error) {
    if (error instanceof JiraAuthError) {
      await clearJiraCookie();
      return NextResponse.json({ error: error.message }, { status: 401 });
    }
    const message = error instanceof Error ? error.message : "";
    if (message === "No active Jira connection found for user.") {
      await clearJiraCookie();
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

/**
 * DELETE /api/jira/issues/[issueIdOrKey] — Delete a Jira issue.
 */
export async function DELETE(
  request: NextRequest,
  context: { params: Promise<{ issueIdOrKey: string }> },
) {
  const userId = request.cookies.get("jira_user_id")?.value || "";
  try {
    const { issueIdOrKey } = await context.params;

    const status = await deleteJiraIssue(userId, issueIdOrKey);

    return new NextResponse(null, { status });
  } catch (error) {
    console.error("Failed to delete Jira issue:", error);
    return NextResponse.json(
      { error: "Failed to delete Jira issue." },
      { status: 500 },
    );
  }
}
