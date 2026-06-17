import type { UpdateTaskPayload } from "@mp/task-core";
import { NextRequest, NextResponse } from "next/server";

import { withAdapter, withAdapterRaw } from "@/lib/platformRoute";
import { parseBody, updateIssueSchema } from "@/lib/schemas/route-schemas";

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

  let raw: unknown;
  try {
    raw = await request.json();
  } catch {
    return NextResponse.json({ error: "Invalid JSON body." }, { status: 400 });
  }

  const parsed = parseBody(updateIssueSchema, raw);
  if (!parsed.ok) return parsed.response;

  const b = parsed.data;
  const payload: UpdateTaskPayload = {};

  if (b.summary !== undefined) payload.summary = b.summary?.trim() ?? "";
  if (b.description !== undefined) payload.description = b.description;
  if (b.issueType !== undefined) payload.issueType = b.issueType === "" ? null : b.issueType;
  if (b.parentIssueKey !== undefined) {
    payload.parentIssueKey =
      b.parentIssueKey === null || b.parentIssueKey === "" ? null : b.parentIssueKey.trim() || null;
  }
  if (b.priority !== undefined) payload.priority = b.priority === "" ? null : b.priority;
  if (b.assignee !== undefined) payload.assignee = b.assignee === "" ? null : b.assignee;
  if (b.dueDate !== undefined) payload.dueDate = b.dueDate === "" ? null : b.dueDate;

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
