import { NextRequest, NextResponse } from "next/server";

import { JiraAuthError } from "@/exceptions/jiraErrors";
import { clearJiraCookie } from "@/helpers/cookies";
import { getCloudIdFromRequest } from "@/helpers/getCloudId";
import { getJiraUserIdFromSession } from "@/helpers/jiraUserId";
import { getIssueTransitions, issueStatusChange } from "@/services/jiraService";

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ issueIdOrKey: string }> },
) {
  try {
    const userId = await getJiraUserIdFromSession(request);
    if (!userId) return NextResponse.json({ error: "No active Jira connection." }, { status: 404 });

    const { issueIdOrKey } = await params;
    const cloudId = getCloudIdFromRequest(request);
    const transitions = await getIssueTransitions(issueIdOrKey, userId, cloudId);

    return NextResponse.json({ transitions: transitions }, { status: 200 });
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

    console.error("Failed to fetch transitions:", error);

    return NextResponse.json(
      {
        error: "Failed to fetch transitions",
      },
      { status: 500 },
    );
  }
}

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ issueIdOrKey: string }> },
) {
  try {
    const userId = await getJiraUserIdFromSession(request);
    if (!userId) return NextResponse.json({ error: "No active Jira connection." }, { status: 404 });

    const { issueIdOrKey } = await params;
    const body = await request.json();
    const { transitionId } = body;

    if (!transitionId) {
      return NextResponse.json({ message: "transitionId is required" }, { status: 400 });
    }

    const cloudId = getCloudIdFromRequest(request);
    await issueStatusChange(issueIdOrKey, transitionId, userId, cloudId);

    return NextResponse.json(
      { success: true, message: "Issue status updated successfully" },
      { status: 200 },
    );
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

    console.error("Failed to update Jira issue status:", error);

    return NextResponse.json(
      {
        error: "Failed to update Jira issue status.",
      },
      { status: 500 },
    );
  }
}
