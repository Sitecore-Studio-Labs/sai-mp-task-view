import { NextRequest, NextResponse } from "next/server";
import { deleteJiraIssue, getDetailsForIssue } from "@/services/jiraService";

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ issueIdOrKey: string }> },
) {
  const userId = request.cookies.get("jira_user_id")?.value || "";

  try {
    const resolvedParams = await params;
    const issueIdOrKey = resolvedParams.issueIdOrKey;

    const issue = await getDetailsForIssue(userId, issueIdOrKey);

    return NextResponse.json(issue);
  } catch (error) {
    console.error("Failed to load Jira issue:", error);
    return NextResponse.json(
      { error: "Failed to load Jira issue.", details: error },
      { status: 500 },
    );
  }
}

export async function DELETE(
  request: NextRequest,
  context: { params: Promise<{ issueIdOrKey: string }> },
) {
  const userId = request.cookies.get("jira_user_id")?.value || "";

  try {
    const { issueIdOrKey } = await context.params;

    const status = await deleteJiraIssue(userId, issueIdOrKey);

    return new NextResponse(null, { status });
  } catch (error) {
    console.error("Failed to delete Jira issue:", error);
    return NextResponse.json(
      { error: "Failed to delete Jira issue." },
      { status: 500 },
    );
  }
}
