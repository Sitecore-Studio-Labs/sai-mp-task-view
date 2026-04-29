import { NextRequest, NextResponse } from "next/server";

import { JiraAuthError } from "@/exceptions/jiraErrors";
import { clearJiraCookie } from "@/helpers/cookies";
import { getJiraUserIdFromSession } from "@/helpers/jiraUserId";
import { JiraServiceAdapter } from "@/platforms/jira/JiraServiceAdapter";

/**
 * Returns Jira projects for the current user.
 * Returns [] (not an error) when there is no active connection or no site selected,
 * because the UI polls this endpoint to detect connection state.
 */
export async function GET(request: NextRequest) {
  const userId = await getJiraUserIdFromSession(request);
  if (!userId) return NextResponse.json([]);

  try {
    const adapter = new JiraServiceAdapter(userId);
    const projects = await adapter.getProjects();
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
    }
    if (message === "No Jira site selected. Please reconnect to Jira and select a site.") {
      return NextResponse.json([]);
    }
    console.error("Failed to load Jira projects:", error);
    return NextResponse.json({ error: "Failed to load Jira projects." }, { status: 500 });
  }
}
