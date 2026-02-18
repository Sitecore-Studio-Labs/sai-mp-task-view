import { deleteJiraIssue } from "@/services/jiraService";
import { NextResponse } from "next/server";

export async function DELETE(
  request: Request,
  { params }: { params: { issueIdOrKey: string } },
) {
  const demoUserId = "00000000-0000-0000-0000-000000000001";

  try {
    const issueIdOrKey = params.issueIdOrKey;

    const status = await deleteJiraIssue(demoUserId, issueIdOrKey);

    return new NextResponse(null, { status });
  } catch (error) {
    console.error("Failed to delete Jira issue:", error);
    return NextResponse.json(
      { error: "Failed to delete Jira issue." },
      { status: 500 },
    );
  }
}
