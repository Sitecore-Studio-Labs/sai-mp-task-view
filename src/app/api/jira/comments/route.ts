import { NextResponse } from "next/server";
import { getCommentsForIssue } from "@/services/jiraService";

/**
 * Get comments for a Jira issue.
 * Params: { issueIdOrKey }
 */
export async function GET(request: Request) {
  const demoUserId = "00000000-0000-0000-0000-000000000001";

  const { searchParams } = new URL(request.url);
  const issueIdOrKey = searchParams.get("issueIdOrKey");

  if (!issueIdOrKey) {
    return NextResponse.json(
      { error: "issueIdOrKey query parameter is required" },
      { status: 400 }
    );
  }

  try {
    const commentsResponse = await getCommentsForIssue(demoUserId, issueIdOrKey);

    return NextResponse.json(commentsResponse);
  } catch (error) {
    console.error("Failed to load comments for issue:", error);
    return NextResponse.json(
      { error: "Failed to load comments for issue:", details: error },
      { status: 500 },
    );
  }
}
