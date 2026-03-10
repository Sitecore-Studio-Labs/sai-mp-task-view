import { NextRequest, NextResponse } from "next/server";
import { getDetailsForComment } from "@/services/jiraService";
import { cookies } from "next/headers";
import { JiraAuthError } from "@/exceptions/jiraErrors";

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
    if (error instanceof JiraAuthError) {
      (await cookies()).set("jira_user_id", "", {
        httpOnly: true,
        secure: true,
        sameSite: "none",
        expires: new Date(0),
      });
      return NextResponse.json({ error: error.message }, { status: 401 });
    }
    const message = error instanceof Error ? error.message : "";
    if (message === "No active Jira connection found for user.") {
      (await cookies()).set("jira_user_id", "", {
        httpOnly: true,
        secure: true,
        sameSite: "none",
        expires: new Date(0),
      });
      return NextResponse.json(
        { error: "No active Jira connection." },
        { status: 401 },
      );
    }

    console.error("Failed to load comment details:", error);
    return NextResponse.json(
      { error: "Failed to load comment details:", details: error },
      { status: 500 },
    );
  }
}
