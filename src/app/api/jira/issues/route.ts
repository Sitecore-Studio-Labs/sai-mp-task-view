import { NextRequest, NextResponse } from "next/server";
import { searchJiraIssuesForProject } from "@/services/jiraService";

/**
 * Search issues in a project (for parent issue picker).
 * Query: projectId (required), query (optional search term).
 */
export async function GET(request: NextRequest) {
  const demoUserId = "00000000-0000-0000-0000-000000000001";
  const projectIdOrKey = request.nextUrl.searchParams.get("projectId");
  const query = request.nextUrl.searchParams.get("query") ?? undefined;

  if (!projectIdOrKey) {
    return NextResponse.json(
      { error: "Missing required query parameter: projectId" },
      { status: 400 },
    );
  }

  try {
    const issues = await searchJiraIssuesForProject(
      demoUserId,
      projectIdOrKey,
      query?.trim() || undefined,
    );
    return NextResponse.json(issues);
  } catch (error) {
    const message = error instanceof Error ? error.message : "";
    if (message === "No active Jira connection found for user.") {
      return NextResponse.json(
        { error: "No active Jira connection." },
        { status: 401 },
      );
    }
    console.error("Failed to search Jira issues:", error);
    return NextResponse.json(
      { error: "Failed to search issues." },
      { status: 500 },
    );
  }
}
