import { NextResponse } from "next/server";
import { getJiraProjectsForUser } from "@/services/jiraService";

/**
 * Returns Jira projects for the current user.
 * If the user has not connected Jira yet, returns an empty array (no error).
 */
export async function GET() {
  // Replace this with your real user identification (e.g. from cookies/JWT).
  const demoUserId = "00000000-0000-0000-0000-000000000001";

  try {
    const projects = await getJiraProjectsForUser(demoUserId);
    return NextResponse.json(projects);
  } catch (error) {
    const message = error instanceof Error ? error.message : "";
    if (message === "No active Jira connection found for user.") {
      return NextResponse.json([]);
    }
     
    console.error("Failed to load Jira projects:", error);
    return NextResponse.json(
      { error: "Failed to load Jira projects." },
      { status: 500 },
    );
  }
}
