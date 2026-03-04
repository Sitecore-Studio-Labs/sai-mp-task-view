import { NextRequest, NextResponse } from "next/server";
import { getJiraIssueTypesForProject } from "@/services/jiraService";

/**
 * Returns Jira issue types for a project for the current user.
 * Query: projectId (required).
 */
export async function GET(request: NextRequest) {
  const demoUserId = "00000000-0000-0000-0000-000000000001";

  const projectId = request.nextUrl.searchParams.get("projectId");

  if (!projectId) {
    return NextResponse.json(
      { error: "Missing required query parameter: projectId" },
      { status: 400 },
      { status: 400 },
    );
  }

  try {
    const issueTypes = await getJiraIssueTypesForProject(demoUserId, projectId);

    return NextResponse.json(issueTypes);
  } catch (error) {
    const message = error instanceof Error ? error.message : "";

    if (message === "No active Jira connection found for user.") {
      return NextResponse.json(
        { error: "No active Jira connection." },
        { status: 401 },
      );
      return NextResponse.json(
        { error: "No active Jira connection." },
        { status: 401 },
      );
    }

    console.error("Failed to load Jira issue types:", error);

    return NextResponse.json(
      { error: "Failed to load Jira issue types." },
      { status: 500 },
      { status: 500 },
    );
  }
}
