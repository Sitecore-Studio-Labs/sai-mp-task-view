import { NextRequest, NextResponse } from "next/server";

import { JiraAuthError } from "@/exceptions/jiraErrors";
import { clearJiraCookie } from "@/helpers/cookies";
import { getCloudIdFromRequest } from "@/helpers/getCloudId";
import { getJiraUserIdFromSession } from "@/helpers/jiraUserId";
import { searchJiraAssigneesForUser } from "@/services/jiraService";

/**
 * Search Jira assignable users for a project.
 * Query:
 * - projectId (required): project id or key.
 * - query (optional): search term.
 */
export async function GET(request: NextRequest) {
  const userId = await getJiraUserIdFromSession(request);
  if (!userId) return NextResponse.json({ error: "No active Jira connection." }, { status: 404 });
  const projectIdOrKey = request.nextUrl.searchParams.get("projectId");
  const query = request.nextUrl.searchParams.get("query") ?? undefined;

  if (!projectIdOrKey) {
    return NextResponse.json(
      { error: "Missing required query parameter: projectId" },
      { status: 400 },
    );
  }

  try {
    const cloudId = getCloudIdFromRequest(request);
    const users = await searchJiraAssigneesForUser(
      userId,
      { projectIdOrKey, query: query?.trim() || undefined },
      cloudId,
    );
    return NextResponse.json(users);
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

    return NextResponse.json({ error: "Failed to search Jira assignees." }, { status: 500 });
  }
}
