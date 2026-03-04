import { NextRequest, NextResponse } from "next/server";
import {
  createCommentForIssue,
  getCommentsForIssue,
} from "@/services/jiraService";
import { CreateCommentPayload } from "@/types/jira";

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
      { status: 400 },
    );
  }

  try {
    const commentsResponse = await getCommentsForIssue(
      demoUserId,
      issueIdOrKey,
    );

    return NextResponse.json(commentsResponse);
  } catch (error) {
    console.error("Failed to load comments for issue:", error);
    return NextResponse.json(
      { error: "Failed to load comments for issue:", details: error },
      { status: 500 },
    );
  }
}

/**
 * Creates a Jira comment for the an issue.
 * Body: { text }
 * Params: { issueIdOrKey }
 */
export async function POST(request: NextRequest) {
  try {

    const body: CreateCommentPayload = await request.json();

    if (!body.text) {
      return NextResponse.json({ error: "text is required" }, { status: 400 });
    }

    const demoUserId = "00000000-0000-0000-0000-000000000001";

    const comment = await createCommentForIssue(demoUserId, body);

    return NextResponse.json(comment, { status: 200 });
  } catch (error) {
    console.error("Failed to create Jira comment:", error);
    return NextResponse.json(
      { error: "Failed to create Jira comment:", details: error },
      { status: 500 },
    );
  }
}
