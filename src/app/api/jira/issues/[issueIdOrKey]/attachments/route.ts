import { NextRequest, NextResponse } from "next/server";
import { addAttachmentToJiraIssue } from "@/services/jiraService";
import { JiraAuthError } from "@/exceptions/jiraErrors";
import { clearJiraCookie } from "@/helpers/cookies";

/**
 * POST: Add an attachment to a Jira issue.
 * Body: multipart/form-data with field "file".
 */
export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ issueIdOrKey: string }> },
) {
  const userId = request.cookies.get("jira_user_id")?.value || "";
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
    await addAttachmentToJiraIssue(userId, issueIdOrKey, {
      buffer,
      fileName: file.name,
      mimeType: file.type || "application/octet-stream",
    });

    return NextResponse.json({ success: true });
  } catch (error) {
    if (error instanceof JiraAuthError) {
      await clearJiraCookie();
      return NextResponse.json({ error: error.message }, { status: 401 });
    }
    const message = error instanceof Error ? error.message : "";
    if (message === "No active Jira connection found for user.") {
      await clearJiraCookie();
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
