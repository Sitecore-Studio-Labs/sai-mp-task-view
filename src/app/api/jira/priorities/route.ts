import { NextRequest, NextResponse } from "next/server";
import { cookies } from "next/headers";
import { getJiraPrioritiesForUser } from "@/services/jiraService";
import { JiraAuthError } from "@/exceptions/jiraErrors";

/**
 * Returns Jira priorities for the current user.
 */
export async function GET(request: NextRequest) {
  const userId = request.cookies.get("jira_user_id")?.value || "";

  try {
    const priorities = await getJiraPrioritiesForUser(userId);
    return NextResponse.json(priorities);
  } catch (error) {
    if (error instanceof JiraAuthError) {
      (await cookies()).set("jira_user_id", "", {
        httpOnly: true,
        secure: true,
        sameSite: "none",
        expires: new Date(0),
      });
      return NextResponse.json({ error: error.message }, { status: 401 });
    }
    const message = error instanceof Error ? error.message : "";
    if (message === "No active Jira connection found for user.") {
      (await cookies()).set("jira_user_id", "", {
        httpOnly: true,
        secure: true,
        sameSite: "none",
        expires: new Date(0),
      });
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
