import type { CreateTaskPayload } from "@mp/task-core";
import { NextRequest, NextResponse } from "next/server";

import { withAdapter, withAdapterRaw } from "@/lib/platformRoute";
import { JiraClientError } from "@/platforms/jira/JiraAdapter";

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
  const cursor = request.nextUrl.searchParams.get("cursor") ?? undefined;
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
  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: "Invalid JSON body." }, { status: 400 });
  }

  const {
    projectId,
    issueTypeId,
    summary,
    description,
    priority,
    assignee,
    dueDate,
    parentIssueKey,
  } = body as Record<string, unknown>;

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
    return NextResponse.json({ error: "Invalid body field: priority (string)." }, { status: 400 });
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
    if (!/^\d{4}-\d{2}-\d{2}/.test(trimmed) && Number.isNaN(new Date(trimmed).getTime())) {
      return NextResponse.json(
        { error: "Invalid body field: dueDate (expected ISO date/datetime string)." },
        { status: 400 },
      );
    }
  }

  const payload: CreateTaskPayload = {
    projectId,
    issueTypeId,
    summary: summary.trim(),
    ...(typeof description === "string" && { description: description.trim() || undefined }),
    ...(typeof priority === "string" && { priority: priority.trim() || undefined }),
    ...(typeof assignee === "string" && { assignee: assignee.trim() || undefined }),
    ...(typeof dueDate === "string" && { dueDate: dueDate.trim() || undefined }),
    ...(typeof parentIssueKey === "string" &&
      parentIssueKey.trim() && { parentIssueKey: parentIssueKey.trim() }),
  };

  return withAdapterRaw(request, async (adapter) => {
    try {
      const task = await adapter.createTask(payload);
      return NextResponse.json(task);
    } catch (error) {
      if (error instanceof JiraClientError) {
        return NextResponse.json({ error: error.message }, { status: error.statusCode });
      }
      throw error;
    }
  });
}
