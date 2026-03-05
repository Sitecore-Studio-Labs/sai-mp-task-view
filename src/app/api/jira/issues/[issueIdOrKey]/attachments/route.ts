import { NextRequest, NextResponse } from "next/server";
import { addAttachmentToJiraIssue } from "@/services/jiraService";

const DEMO_USER_ID = "00000000-0000-0000-0000-000000000001";

/**
 * POST: Add an attachment to a Jira issue.
 * Body: multipart/form-data with field "file".
 */
export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ issueIdOrKey: string }> },
) {
  try {
    const { issueIdOrKey } = await params;
    if (!issueIdOrKey) {
      return NextResponse.json(
        { error: "Missing issueIdOrKey" },
        { status: 400 },
      );
    }

    const formData = await request.formData();
    const file = formData.get("file");
    if (!file || !(file instanceof File)) {
      return NextResponse.json(
        { error: "Missing or invalid file in form (field: file)" },
        { status: 400 },
      );
    }

    const buffer = Buffer.from(await file.arrayBuffer());
    await addAttachmentToJiraIssue(DEMO_USER_ID, issueIdOrKey, {
      buffer,
      fileName: file.name,
      mimeType: file.type || "application/octet-stream",
    });

    return NextResponse.json({ success: true });
  } catch (error) {
    const message = error instanceof Error ? error.message : "";
    if (message === "No active Jira connection found for user.") {
      return NextResponse.json(
        { error: "No active Jira connection." },
        { status: 401 },
      );
    }
    console.error("Failed to add attachment to Jira issue:", error);
    return NextResponse.json(
      { error: "Failed to add attachment." },
      { status: 500 },
    );
  }
}
