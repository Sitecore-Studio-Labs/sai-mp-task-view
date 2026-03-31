import { NextRequest, NextResponse } from "next/server";

import { JiraAuthError } from "@/exceptions/jiraErrors";
import { clearJiraCookie } from "@/helpers/cookies";
import { getJiraUserIdFromSession } from "@/helpers/jiraUserId";
import {
  addAttachmentToJiraIssue,
  deleteAttachmentForUser,
  getAttachmentContent,
} from "@/services/jiraService";

const UPLOAD_SEGMENT = "upload";

function attachmentError(message: string, status: number) {
  return NextResponse.json({ error: message }, { status });
}

/**
 * POST: Add an attachment to a Jira issue.
 * Only when path segment is "upload": POST /api/jira/attachment/upload?issueIdOrKey=KAN-123
 * Body: multipart/form-data with field "file".
 */
export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ attachmentId: string }> },
) {
  const userId = await getJiraUserIdFromSession(request);
  if (!userId) return NextResponse.json({ error: "No active Jira connection." }, { status: 404 });
  const { attachmentId } = await params;
  if (attachmentId !== UPLOAD_SEGMENT) {
    return attachmentError("Not found.", 404);
  }
  try {
    const issueIdOrKey = request.nextUrl.searchParams.get("issueIdOrKey")?.trim();
    if (!issueIdOrKey) {
      return attachmentError("Missing required query parameter: issueIdOrKey", 400);
    }
    const formData = await request.formData();
    const file = formData.get("file");
    if (!file || !(file instanceof File)) {
      return attachmentError("Missing or invalid file in form (field: file)", 400);
    }
    const buffer = Buffer.from(await file.arrayBuffer());
    await addAttachmentToJiraIssue(userId, issueIdOrKey, {
      buffer,
      fileName: file.name,
      mimeType: file.type || "application/octet-stream",
    });
    return NextResponse.json({ success: true });
  } catch (error) {
    const message = error instanceof Error ? error.message : "";
    if (message === "No active Jira connection found for user.") {
      return NextResponse.json({ error: "No active Jira connection." }, { status: 401 });
    }
    console.error("Failed to add attachment to Jira issue:", error);
    return NextResponse.json({ error: "Failed to add attachment." }, { status: 500 });
  }
}

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ attachmentId: string }> },
) {
  const userId = await getJiraUserIdFromSession(request);
  if (!userId) return NextResponse.json({ error: "No active Jira connection." }, { status: 404 });
  const resolvedParams = await params;
  const attachmentId = resolvedParams.attachmentId;

  if (!attachmentId) {
    return NextResponse.json(
      { error: "Missing required query parameter: attachmentId" },
      { status: 400 },
    );
  }

  try {
    const { data, contentType } = await getAttachmentContent(attachmentId, userId);

    return new NextResponse(data, {
      headers: {
        "Content-Type": contentType,
        "Content-Disposition": "inline",
      },
    });
  } catch (error) {
    if (error instanceof JiraAuthError) {
      await clearJiraCookie();
      return NextResponse.json({ error: error.message }, { status: 401 });
    }
    const message = error instanceof Error ? error.message : "";

    if (message === "No active Jira connection found for user.") {
      await clearJiraCookie();
      return NextResponse.json({ error: "No active Jira connection." }, { status: 401 });
    }

    console.error("Failed to load Attachment:", error);

    return NextResponse.json({ error: "Failed to load attachment." }, { status: 500 });
  }
}

export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ attachmentId: string }> },
) {
  const userId = await getJiraUserIdFromSession(request);
  if (!userId) return NextResponse.json({ error: "No active Jira connection." }, { status: 404 });
  const resolvedParams = await params;
  const attachmentId = resolvedParams.attachmentId;

  if (!attachmentId) {
    return NextResponse.json(
      { error: "Missing required query parameter: attachmentId" },
      { status: 400 },
    );
  }

  try {
    await deleteAttachmentForUser(userId, attachmentId);
    return NextResponse.json({ success: true });
  } catch (error) {
    const message = error instanceof Error ? error.message : "";

    if (message === "No active Jira connection found for user.") {
      return NextResponse.json({ error: "No active Jira connection." }, { status: 401 });
    }

    console.error("Failed to delete attachment:", error);
    return NextResponse.json({ error: "Failed to delete attachment." }, { status: 500 });
  }
}
