import { NextRequest, NextResponse } from "next/server";

import { handlePlatformError } from "@/helpers/platformRouteError";
import { getPlatformUserIdFromSession } from "@/helpers/platformUserId";
import { changeTaskStatus, getTransitionsForTask } from "@/services/platformService";

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ taskId: string }> },
) {
  const userId = await getPlatformUserIdFromSession(request);
  if (!userId) return NextResponse.json({ error: "No active connection." }, { status: 404 });

  try {
    const { taskId } = await params;
    const transitions = await getTransitionsForTask(userId, taskId);
    return NextResponse.json({ transitions });
  } catch (error) {
    return handlePlatformError(error, "Failed to fetch transitions");
  }
}

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ taskId: string }> },
) {
  const userId = await getPlatformUserIdFromSession(request);
  if (!userId) return NextResponse.json({ error: "No active connection." }, { status: 404 });

  try {
    const { taskId } = await params;
    const body = await request.json();
    const { transitionId } = body as { transitionId?: string };

    if (!transitionId) {
      return NextResponse.json({ error: "transitionId is required." }, { status: 400 });
    }

    await changeTaskStatus(userId, taskId, transitionId);
    return NextResponse.json({ success: true, message: "Status updated successfully." });
  } catch (error) {
    return handlePlatformError(error, "Failed to update status");
  }
}
