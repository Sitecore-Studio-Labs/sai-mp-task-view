import { NextRequest, NextResponse } from "next/server";
import { searchJiraAssigneesForUser } from "@/services/jiraService";

/**
 * Search Jira assignable users for a project.
 * Query:
 * - projectId (required): project id or key.
 * - query (optional): search term.
 */
export async function GET(request: NextRequest) {
  const userId = request.cookies.get("jira_user_id")?.value || "";
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
    const message = error instanceof Error ? error.message : "";
    if (message === "No active Jira connection found for user.") {
      return NextResponse.json(
        { error: "No active Jira connection." },
        { status: 401 },
      );
    }

    console.error("Failed to search Jira assignees:", error);
    return NextResponse.json(
      { error: "Failed to search Jira assignees." },
      { status: 500 },
    );
  }
}
