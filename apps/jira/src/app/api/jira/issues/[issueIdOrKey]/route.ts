import type { UpdateTaskPayload } from "@mp/task-core";
import { NextRequest, NextResponse } from "next/server";

import { withAdapter, withAdapterRaw } from "@/lib/platformRoute";

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ issueIdOrKey: string }> },
) {
  const { issueIdOrKey } = await params;
  return withAdapter(request, (adapter) => adapter.getTask(issueIdOrKey));
}

export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ issueIdOrKey: string }> },
) {
  const { issueIdOrKey } = await params;

  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: "Invalid JSON body." }, { status: 400 });
  }

  const b = body as Record<string, unknown>;
  const payload: UpdateTaskPayload = {};

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
    payload.description = typeof b.description === "string" ? b.description : null;
  }
  if (b.issueType !== undefined) {
    if (typeof b.issueType !== "string" && b.issueType !== null) {
      return NextResponse.json(
        { error: "Invalid body: issueType must be a string (id) or null." },
        { status: 400 },
      );
    }
    payload.issueType = b.issueType === "" ? null : (b.issueType as string | null);
  }
  if (b.parentIssueKey !== undefined) {
    if (typeof b.parentIssueKey !== "string" && b.parentIssueKey !== null) {
      return NextResponse.json(
        { error: "Invalid body: parentIssueKey must be a string (issue key) or null." },
        { status: 400 },
      );
    }
    payload.parentIssueKey =
      b.parentIssueKey === null || b.parentIssueKey === ""
        ? null
        : (b.parentIssueKey as string).trim() || null;
  }
  if (b.priority !== undefined) {
    if (typeof b.priority !== "string" && b.priority !== null) {
      return NextResponse.json(
        { error: "Invalid body: priority must be a string or null." },
        { status: 400 },
      );
    }
    payload.priority = b.priority === "" ? null : (b.priority as string | null);
  }
  if (b.assignee !== undefined) {
    if (typeof b.assignee !== "string" && b.assignee !== null) {
      return NextResponse.json(
        { error: "Invalid body: assignee must be a string (accountId) or null." },
        { status: 400 },
      );
    }
    payload.assignee = b.assignee === "" ? null : (b.assignee as string | null);
  }
  if (b.dueDate !== undefined) {
    if (typeof b.dueDate !== "string" && b.dueDate !== null) {
      return NextResponse.json(
        { error: "Invalid body: dueDate must be an ISO string or null." },
        { status: 400 },
      );
    }
    payload.dueDate = b.dueDate === "" ? null : (b.dueDate as string | null);
  }

  if (Object.keys(payload).length === 0) {
    return NextResponse.json(
      {
        error:
          "No fields to update. Send at least one of summary, description, issueType, parentIssueKey, priority, assignee, dueDate.",
      },
      { status: 400 },
    );
  }

  return withAdapter(request, (adapter) => adapter.updateTask(issueIdOrKey, payload));
}

export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ issueIdOrKey: string }> },
) {
  const { issueIdOrKey } = await params;
  return withAdapterRaw(request, async (adapter) => {
    const status = await adapter.deleteTask(issueIdOrKey);
    return new NextResponse(null, { status });
  });
}
