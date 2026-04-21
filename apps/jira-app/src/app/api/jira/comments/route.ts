import { NextRequest, NextResponse } from "next/server";

import { JiraAuthError } from "@/exceptions/jiraErrors";
import { clearJiraCookie } from "@/helpers/cookies";
import { getJiraUserIdFromSession } from "@/helpers/jiraUserId";
import { createCommentForIssue, getCommentsForIssue } from "@/services/jiraService";
import { CreateCommentPayload } from "@/types/jira";

/**
 * Get comments for a Jira issue.
 * Params: { issueIdOrKey }
 */
export async function GET(request: NextRequest) {
  const userId = await getJiraUserIdFromSession(request);
  if (!userId) return NextResponse.json({ error: "No active Jira connection." }, { status: 404 });

  const { searchParams } = new URL(request.url);
  const issueIdOrKey = searchParams.get("issueIdOrKey");

  if (!issueIdOrKey) {
    return NextResponse.json(
      { error: "issueIdOrKey query parameter is required" },
      { status: 400 },
    );
  }

  try {
    const commentsResponse = await getCommentsForIssue(userId, issueIdOrKey);

    return NextResponse.json(commentsResponse);
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
    console.error("Failed to load comments for issue:", error);
    return NextResponse.json({ error: "Failed to load comments for issue." }, { status: 500 });
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

    const userId = await getJiraUserIdFromSession(request);
    if (!userId) return NextResponse.json({ error: "No active Jira connection." }, { status: 404 });

    const comment = await createCommentForIssue(userId, body);

    return NextResponse.json(comment, { status: 200 });
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
    console.error("Failed to create Jira comment:", error);
    return NextResponse.json(
      { error: "Failed to create Jira comment:", details: error },
      { status: 500 },
    );
  }
}
