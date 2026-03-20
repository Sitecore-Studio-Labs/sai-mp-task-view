import { NextRequest, NextResponse } from "next/server";

import { JiraAuthError } from "@/exceptions/jiraErrors";
import { clearJiraCookie } from "@/helpers/cookies";
import { resolveJiraUserIdFromRequest } from "@/helpers/jiraUserId";
import { getJiraIssueTypesForProject } from "@/services/jiraService";

/**
 * Returns Jira issue types for a project for the current user.
 * Query: projectId (required).
 */
export async function GET(request: NextRequest) {
  const userId = await resolveJiraUserIdFromRequest(request, { emptyValue: "" });
  if (!userId) {
    return NextResponse.json({ error: "No active Jira connection." }, { status: 401 });
  }

  const projectId = request.nextUrl.searchParams.get("projectId");

  if (!projectId) {
    return NextResponse.json(
      { error: "Missing required query parameter: projectId" },
      { status: 400 },
    );
  }

  try {
    const issueTypes = await getJiraIssueTypesForProject(userId, projectId);

    return NextResponse.json(issueTypes);
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

    console.error("Failed to load Jira issue types:", error);

    return NextResponse.json({ error: "Failed to load Jira issue types." }, { status: 500 });
  }
}
