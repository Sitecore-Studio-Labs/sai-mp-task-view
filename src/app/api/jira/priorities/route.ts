import { NextResponse } from "next/server";
import { getJiraPrioritiesForUser } from "@/services/jiraService";

/**
 * Returns Jira priorities for the current user.
 */
export async function GET() {
  const demoUserId = "00000000-0000-0000-0000-000000000001";

  try {
    const priorities = await getJiraPrioritiesForUser(demoUserId);
    return NextResponse.json(priorities);
  } catch (error) {
    const message = error instanceof Error ? error.message : "";
    if (message === "No active Jira connection found for user.") {
      return NextResponse.json({ error: "No active Jira connection." }, { status: 401 });
    }
     
    console.error("Failed to load Jira priorities:", error);
    return NextResponse.json({ error: "Failed to load Jira priorities." }, { status: 500 });
  }
}

