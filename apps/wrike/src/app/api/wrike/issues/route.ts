import type { CreateTaskPayload } from "@mp/task-core";
import { NextRequest, NextResponse } from "next/server";

import { withAdapter } from "@/lib/platformRoute";
import { createIssueSchema, parseBody } from "@/lib/schemas/route-schemas";

function getFiltersFromRequest(request: NextRequest) {
  const searchParams = request.nextUrl.searchParams;
  const status = searchParams.getAll("status").filter((s) => s.trim() !== "");
  const priority = searchParams.getAll("priority").filter((p) => p.trim() !== "");
  const assignee = searchParams.getAll("assignee").filter((a) => a.trim() !== "");

  if (status.length === 0 && priority.length === 0 && assignee.length === 0) return undefined;
  return {
    ...(status.length > 0 && { status }),
    ...(priority.length > 0 && { priority }),
    ...(assignee.length > 0 && { assignee }),
  };
}

export async function GET(request: NextRequest) {
  const projectKey = request.nextUrl.searchParams.get("projectKey");
  const cursor =
    request.nextUrl.searchParams.get("cursor") ??
    request.nextUrl.searchParams.get("nextPageToken") ??
    undefined;
  const filters = getFiltersFromRequest(request);

  if (!projectKey?.trim()) {
    return NextResponse.json(
      { error: "Missing required query parameter: projectKey" },
      { status: 400 },
    );
  }

  return withAdapter(request, (adapter) =>
    adapter.getTasks(projectKey.trim(), cursor?.trim() || undefined, filters),
  );
}

export async function POST(request: NextRequest) {
  let raw: unknown;
  try {
    raw = await request.json();
  } catch {
    return NextResponse.json({ error: "Invalid JSON body." }, { status: 400 });
  }

  const parsed = parseBody(createIssueSchema, raw);
  if (!parsed.ok) return parsed.response;

  const { projectId, summary, description, priority, assignee, dueDate, parentIssueKey } =
    parsed.data;

  const payload: CreateTaskPayload = {
    projectId,
    issueTypeId: "task",
    summary: summary.trim(),
    ...(description != null && { description: description.trim() || undefined }),
    ...(priority != null && { priority: priority.trim() || undefined }),
    ...(assignee != null && { assignee: assignee.trim() || undefined }),
    ...(dueDate != null && { dueDate: dueDate.trim() || undefined }),
    ...(parentIssueKey != null &&
      parentIssueKey.trim() && { parentIssueKey: parentIssueKey.trim() }),
  };

  return withAdapter(request, (adapter) => adapter.createTask(payload));
}
