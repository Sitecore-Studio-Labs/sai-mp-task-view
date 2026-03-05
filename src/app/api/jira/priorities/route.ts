import { NextRequest, NextResponse } from "next/server";
import { getJiraPrioritiesForUser } from "@/services/jiraService";

/**
 * Returns Jira priorities for the current user.
 */
export async function GET(request: NextRequest) {
  const userId = request.cookies.get("jira_user_id")?.value || "";

  try {
    const priorities = await getJiraPrioritiesForUser(userId);
    return NextResponse.json(priorities);
  } catch (error) {
    const message = error instanceof Error ? error.message : "";
    if (message === "No active Jira connection found for user.") {
      return NextResponse.json(
        { error: "No active Jira connection." },
        { status: 401 },
      );
    }

    console.error("Failed to load Jira priorities:", error);
    return NextResponse.json(
      { error: "Failed to load Jira priorities." },
      { status: 500 },
    );
  }
}
