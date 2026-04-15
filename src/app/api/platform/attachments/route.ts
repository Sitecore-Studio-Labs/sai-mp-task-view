import { NextRequest, NextResponse } from "next/server";

import { handlePlatformError } from "@/helpers/platformRouteError";
import { getPlatformUserIdFromSession } from "@/helpers/platformUserId";
import { uploadAttachmentForUser } from "@/services/platformService";

export async function POST(request: NextRequest) {
  const userId = await getPlatformUserIdFromSession(request);
  if (!userId) return NextResponse.json({ error: "No active connection." }, { status: 404 });

  const taskId = request.nextUrl.searchParams.get("taskId")?.trim();
  if (!taskId) {
    return NextResponse.json(
      { error: "Missing required query parameter: taskId" },
      { status: 400 },
    );
  }

  try {
    const formData = await request.formData();
    const file = formData.get("file");
    if (!file || !(file instanceof File)) {
      return NextResponse.json(
        { error: "Missing or invalid file in form (field: file)" },
        { status: 400 },
      );
    }

    const buffer = Buffer.from(await file.arrayBuffer());
    const attachment = await uploadAttachmentForUser(userId, taskId, {
      buffer,
      fileName: file.name,
      mimeType: file.type || "application/octet-stream",
    });
    return NextResponse.json(attachment);
  } catch (error) {
    return handlePlatformError(error, "Failed to upload attachment");
  }
}
