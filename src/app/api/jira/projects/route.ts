import { NextRequest, NextResponse } from "next/server";

import { JiraAuthError } from "@/exceptions/jiraErrors";
import { clearJiraCookie } from "@/helpers/cookies";
import { getJiraProjectsForUser } from "@/services/jiraService";

/**
 * Returns Jira projects for the current user.
 * If the user has not connected Jira yet, returns an empty array (no error).
 */
export async function GET(request: NextRequest) {
  // Replace this with your real user identification (e.g. from cookies/JWT).
  const userId = request.cookies.get("jira_user_id")?.value || "";

  try {
    const projects = await getJiraProjectsForUser(userId);
    return NextResponse.json(projects);
  } catch (error) {
    if (error instanceof JiraAuthError) {
      await clearJiraCookie();
      return NextResponse.json({ error: error.message }, { status: 401 });
    }

    const message = error instanceof Error ? error.message : "";
    if (message === "No active Jira connection found for user.") {
      await clearJiraCookie();
      return NextResponse.json([]);
    } else if (message === "No Jira site selected. Please reconnect to Jira and select a site.") {
      return NextResponse.json([]);
    }

    console.error("Failed to load Jira projects:", error);
    return NextResponse.json({ error: "Failed to load Jira projects." }, { status: 500 });
  }
}
