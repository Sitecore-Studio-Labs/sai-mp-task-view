import { NextRequest, NextResponse } from "next/server";

import { handlePlatformError } from "@/helpers/platformRouteError";
import { getPlatformUserIdFromSession } from "@/helpers/platformUserId";
import { deleteAttachmentForUser, getAttachmentContentForUser } from "@/services/platformService";

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ attachmentId: string }> },
) {
  const userId = await getPlatformUserIdFromSession(request);
  if (!userId) return NextResponse.json({ error: "No active connection." }, { status: 404 });

  const { attachmentId } = await params;
  if (!attachmentId) {
    return NextResponse.json({ error: "Missing attachmentId." }, { status: 400 });
  }

  try {
    const { data, contentType } = await getAttachmentContentForUser(userId, attachmentId);
    return new NextResponse(data, {
      headers: {
        "Content-Type": contentType,
        "Content-Disposition": "inline",
      },
    });
  } catch (error) {
    return handlePlatformError(error, "Failed to load attachment");
  }
}

export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ attachmentId: string }> },
) {
  const userId = await getPlatformUserIdFromSession(request);
  if (!userId) return NextResponse.json({ error: "No active connection." }, { status: 404 });

  const { attachmentId } = await params;
  if (!attachmentId) {
    return NextResponse.json({ error: "Missing attachmentId." }, { status: 400 });
  }

  try {
    await deleteAttachmentForUser(userId, attachmentId);
    return NextResponse.json({ success: true });
  } catch (error) {
    return handlePlatformError(error, "Failed to delete attachment");
  }
}
