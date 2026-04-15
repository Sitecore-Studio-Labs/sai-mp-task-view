import { NextRequest, NextResponse } from "next/server";

import { handlePlatformError } from "@/helpers/platformRouteError";
import { getPlatformUserIdFromSession } from "@/helpers/platformUserId";
import {
  deleteTaskForUser,
  getTaskDetailsForUser,
  updateTaskForUser,
} from "@/services/platformService";
import type { PlatformUpdateTaskPayload } from "@/types/platform-entities";

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ taskId: string }> },
) {
  const userId = await getPlatformUserIdFromSession(request);
  if (!userId) return NextResponse.json({ error: "No active connection." }, { status: 404 });

  try {
    const { taskId } = await params;
    const task = await getTaskDetailsForUser(userId, taskId);
    return NextResponse.json(task);
  } catch (error) {
    return handlePlatformError(error, "Failed to load task");
  }
}

export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ taskId: string }> },
) {
  const userId = await getPlatformUserIdFromSession(request);
  if (!userId) return NextResponse.json({ error: "No active connection." }, { status: 404 });
  const { taskId } = await params;

  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: "Invalid JSON body." }, { status: 400 });
  }

  const b = body as Record<string, unknown>;
  const payload: PlatformUpdateTaskPayload = {};

  if (b.summary !== undefined) {
    if (typeof b.summary !== "string")
      return NextResponse.json({ error: "summary must be a string." }, { status: 400 });
    payload.summary = b.summary.trim();
  }
  if (b.description !== undefined) {
    if (typeof b.description !== "string" && b.description !== null)
      return NextResponse.json({ error: "description must be a string or null." }, { status: 400 });
    payload.description = typeof b.description === "string" ? b.description : undefined;
  }
  if (b.issueTypeId !== undefined) {
    if (typeof b.issueTypeId !== "string" && b.issueTypeId !== null)
      return NextResponse.json({ error: "issueTypeId must be a string or null." }, { status: 400 });
    payload.issueTypeId =
      b.issueTypeId === null || b.issueTypeId === "" ? null : (b.issueTypeId as string);
  }
  if (b.parentTaskKey !== undefined) {
    if (typeof b.parentTaskKey !== "string" && b.parentTaskKey !== null)
      return NextResponse.json(
        { error: "parentTaskKey must be a string or null." },
        { status: 400 },
      );
    payload.parentTaskKey =
      b.parentTaskKey === null || b.parentTaskKey === ""
        ? null
        : (b.parentTaskKey as string).trim() || null;
  }
  if (b.priority !== undefined) {
    if (typeof b.priority !== "string" && b.priority !== null)
      return NextResponse.json({ error: "priority must be a string or null." }, { status: 400 });
    payload.priority = b.priority === null || b.priority === "" ? null : (b.priority as string);
  }
  if (b.assignee !== undefined) {
    if (typeof b.assignee !== "string" && b.assignee !== null)
      return NextResponse.json({ error: "assignee must be a string or null." }, { status: 400 });
    payload.assignee = b.assignee === null || b.assignee === "" ? null : (b.assignee as string);
  }
  if (b.dueDate !== undefined) {
    if (typeof b.dueDate !== "string" && b.dueDate !== null)
      return NextResponse.json(
        { error: "dueDate must be an ISO string or null." },
        { status: 400 },
      );
    payload.dueDate = b.dueDate === null || b.dueDate === "" ? null : (b.dueDate as string);
  }
  if (b.statusId !== undefined) {
    if (typeof b.statusId !== "string" && b.statusId !== null)
      return NextResponse.json({ error: "statusId must be a string or null." }, { status: 400 });
    payload.statusId = b.statusId === null || b.statusId === "" ? null : (b.statusId as string);
  }

  if (Object.keys(payload).length === 0) {
    return NextResponse.json(
      { error: "No fields to update. Send at least one updatable field." },
      { status: 400 },
    );
  }

  try {
    const task = await updateTaskForUser(userId, taskId, payload);
    return NextResponse.json(task);
  } catch (error) {
    return handlePlatformError(error, "Failed to update task");
  }
}

export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ taskId: string }> },
) {
  const userId = await getPlatformUserIdFromSession(request);
  if (!userId) return NextResponse.json({ error: "No active connection." }, { status: 404 });

  try {
    const { taskId } = await params;
    await deleteTaskForUser(userId, taskId);
    return new NextResponse(null, { status: 204 });
  } catch (error) {
    return handlePlatformError(error, "Failed to delete task");
  }
}
