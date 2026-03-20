import { NextRequest, NextResponse } from "next/server";

import { JiraAuthError } from "@/exceptions/jiraErrors";
import { clearJiraCookie } from "@/helpers/cookies";
import { resolveJiraUserIdFromRequest } from "@/helpers/jiraUserId";
import { searchJiraAssigneesForUser } from "@/services/jiraService";

/**
 * Search Jira assignable users for a project.
 * Query:
 * - projectId (required): project id or key.
 * - query (optional): search term.
 */
export async function GET(request: NextRequest) {
  const userId = await resolveJiraUserIdFromRequest(request, { emptyValue: "" });
  if (!userId) {
    return NextResponse.json({ error: "No active Jira connection." }, { status: 401 });
  }
  const projectIdOrKey = request.nextUrl.searchParams.get("projectId");
  const query = request.nextUrl.searchParams.get("query") ?? undefined;

  if (!projectIdOrKey) {
    return NextResponse.json(
      { error: "Missing required query parameter: projectId" },
      { status: 400 },
    );
  }

  try {
    const users = await searchJiraAssigneesForUser(userId, {
      projectIdOrKey,
      query: query?.trim() || undefined,
    });
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

    console.error("Failed to search Jira assignees:", error);
    return NextResponse.json({ error: "Failed to search Jira assignees." }, { status: 500 });
  }
}
