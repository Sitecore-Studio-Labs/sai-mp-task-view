import { NextRequest, NextResponse } from "next/server";
import { getDetailsForComment } from "@/services/jiraService";

/**
 * Get details for a comment.
 * Params: { issueIdOrKey, commentId }
 */
export async function GET(
  request: NextRequest,
  context: { params: Promise<{ commentId: string }> },
) {
  const userId = request.cookies.get("jira_user_id")?.value || "";

  const { commentId } = await context.params;
  const { searchParams } = new URL(request.url);
  const issueIdOrKey = searchParams.get("issueIdOrKey");

  if (!issueIdOrKey) {
    return NextResponse.json(
      { error: "issueIdOrKey query parameter is required" },
      { status: 400 },
    );
  }

  if (!commentId) {
    return NextResponse.json(
      { error: "commentId parameter is required" },
      { status: 400 },
    );
  }

  try {
    const commentsResponse = await getDetailsForComment(
      userId,
      issueIdOrKey,
      commentId,
    );

    return NextResponse.json(commentsResponse);
  } catch (error) {
    console.error("Failed to load comment details:", error);
    return NextResponse.json(
      { error: "Failed to load comment details:", details: error },
      { status: 500 },
    );
  }
}
