import { NextRequest, NextResponse } from "next/server";

import { handlePlatformError } from "@/helpers/platformRouteError";
import { getPlatformUserIdFromSession } from "@/helpers/platformUserId";
import { createCommentForTask, getCommentsForTask } from "@/services/platformService";

export async function GET(request: NextRequest) {
  const userId = await getPlatformUserIdFromSession(request);
  if (!userId) return NextResponse.json({ error: "No active connection." }, { status: 404 });

  const taskId = request.nextUrl.searchParams.get("taskId");
  if (!taskId) {
    return NextResponse.json({ error: "taskId query parameter is required." }, { status: 400 });
  }

  try {
    const result = await getCommentsForTask(userId, taskId);
    return NextResponse.json(result);
  } catch (error) {
    return handlePlatformError(error, "Failed to load comments");
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
  if (typeof b.taskId !== "string" || !b.taskId) {
    return NextResponse.json({ error: "taskId is required." }, { status: 400 });
  }
  if (typeof b.text !== "string" || !b.text) {
    return NextResponse.json({ error: "text is required." }, { status: 400 });
  }

  try {
    const comment = await createCommentForTask(userId, {
      taskId: b.taskId as string,
      text: b.text as string,
      ...(typeof b.replyToAuthorId === "string" && { replyToAuthorId: b.replyToAuthorId }),
      ...(typeof b.replyToAuthorName === "string" && { replyToAuthorName: b.replyToAuthorName }),
    });
    return NextResponse.json(comment);
  } catch (error) {
    return handlePlatformError(error, "Failed to create comment");
  }
}
