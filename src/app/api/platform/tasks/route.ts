import { NextRequest, NextResponse } from "next/server";

import { handlePlatformError } from "@/helpers/platformRouteError";
import { getPlatformUserIdFromSession } from "@/helpers/platformUserId";
import { createTaskForUser, getTasksForProject } from "@/services/platformService";
import type { PlatformCreateTaskPayload, PlatformTaskFilters } from "@/types/platform-entities";

function getFiltersFromRequest(request: NextRequest): PlatformTaskFilters | undefined {
  const sp = request.nextUrl.searchParams;
  const status = sp.getAll("status").filter((s) => s.trim() !== "");
  const priority = sp.getAll("priority").filter((p) => p.trim() !== "");
  const assignee = sp.getAll("assignee").filter((a) => a.trim() !== "");
  const query = sp.get("query")?.trim() || "";

  if (status.length === 0 && priority.length === 0 && assignee.length === 0 && !query)
    return undefined;
  const filters: PlatformTaskFilters = {};
  if (status.length > 0) filters.status = status;
  if (priority.length > 0) filters.priority = priority;
  if (assignee.length > 0) filters.assignee = assignee;
  if (query) filters.query = query;
  return filters;
}

export async function GET(request: NextRequest) {
  const userId = await getPlatformUserIdFromSession(request);
  if (!userId) return NextResponse.json({ error: "No active connection." }, { status: 404 });

  const projectId = request.nextUrl.searchParams.get("projectId");
  const cursor = request.nextUrl.searchParams.get("cursor") ?? undefined;
  const filters = getFiltersFromRequest(request);

  if (!projectId) {
    return NextResponse.json(
      { error: "Missing required query parameter: projectId" },
      { status: 400 },
    );
  }

  try {
    const result = await getTasksForProject(
      userId,
      projectId.trim(),
      cursor?.trim() || undefined,
      filters,
    );
    return NextResponse.json(result);
  } catch (error) {
    return handlePlatformError(error, "Failed to fetch tasks");
  }
}

export async function POST(request: NextRequest) {
  const userId = await getPlatformUserIdFromSession(request);
  if (!userId) return NextResponse.json({ error: "No active connection." }, { status: 404 });

  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: "Invalid JSON body." }, { status: 400 });
  }

  const b = body as Record<string, unknown>;

  if (typeof b.projectId !== "string" || !b.projectId) {
    return NextResponse.json({ error: "Missing or invalid: projectId (string)." }, { status: 400 });
  }
  if (typeof b.summary !== "string" || !(b.summary as string).trim()) {
    return NextResponse.json(
      { error: "Missing or invalid: summary (non-empty string)." },
      { status: 400 },
    );
  }

  if (b.priority != null && typeof b.priority !== "string") {
    return NextResponse.json({ error: "Invalid: priority (string)." }, { status: 400 });
  }
  if (b.assignee != null && typeof b.assignee !== "string") {
    return NextResponse.json({ error: "Invalid: assignee (string)." }, { status: 400 });
  }
  if (b.dueDate != null && typeof b.dueDate !== "string") {
    return NextResponse.json({ error: "Invalid: dueDate (ISO string)." }, { status: 400 });
  }
  if (b.issueTypeId != null && typeof b.issueTypeId !== "string") {
    return NextResponse.json({ error: "Invalid: issueTypeId (string)." }, { status: 400 });
  }
  if (b.parentTaskKey != null && typeof b.parentTaskKey !== "string") {
    return NextResponse.json({ error: "Invalid: parentTaskKey (string)." }, { status: 400 });
  }

  const payload: PlatformCreateTaskPayload = {
    projectId: b.projectId as string,
    summary: (b.summary as string).trim(),
    ...(typeof b.description === "string" && { description: b.description.trim() || undefined }),
    ...(typeof b.issueTypeId === "string" && { issueTypeId: b.issueTypeId }),
    ...(typeof b.priority === "string" && { priority: b.priority.trim() || undefined }),
    ...(typeof b.assignee === "string" && { assignee: b.assignee.trim() || undefined }),
    ...(typeof b.dueDate === "string" && { dueDate: b.dueDate.trim() || undefined }),
    ...(typeof b.parentTaskKey === "string" &&
      (b.parentTaskKey as string).trim() && { parentTaskKey: (b.parentTaskKey as string).trim() }),
  };

  try {
    const task = await createTaskForUser(userId, payload);
    return NextResponse.json(task);
  } catch (error) {
    return handlePlatformError(error, "Failed to create task");
  }
}
