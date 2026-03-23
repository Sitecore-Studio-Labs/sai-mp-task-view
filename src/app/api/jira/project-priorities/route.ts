import { NextRequest, NextResponse } from "next/server";

import { JiraAuthError } from "@/exceptions/jiraErrors";
import { clearJiraCookie } from "@/helpers/cookies";
import { getJiraPrioritiesForProject } from "@/services/jiraService";

/**
 * Returns Jira priorities for the project.
 */
export async function GET(request: NextRequest) {
  const projectKey = request.nextUrl.searchParams.get("projectKey") || "";
  const userId = request.cookies.get("jira_user_id")?.value || "";

  try {
    const priorities = await getJiraPrioritiesForProject(userId, projectKey);
    return NextResponse.json(priorities);
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

    console.error("Failed to load Jira priorities:", error);
    return NextResponse.json({ error: "Failed to load Jira priorities." }, { status: 500 });
  }
}
