import { NextRequest, NextResponse } from "next/server";
import { getJiraCurrentUser } from "@/services/jiraService";
import { JiraAuthError } from "@/exceptions/jiraErrors";
import { clearJiraCookie } from "@/helpers/cookies";

export async function GET(request: NextRequest) {
  const userId = request.cookies.get("jira_user_id")?.value || "";

  try {
    const user = await getJiraCurrentUser(userId);
    return NextResponse.json(user);
  } catch (error) {
    if (error instanceof JiraAuthError) {
      await clearJiraCookie();
      return NextResponse.json({ error: error.message }, { status: 401 });
    }
    const message = error instanceof Error ? error.message : "";
    if (message === "No active Jira connection found for user.") {
      await clearJiraCookie();
      return NextResponse.json(
        { error: "No active Jira connection." },
        { status: 401 },
      );
    }
    
    console.error("Failed to get Jira current user:", error);
    return NextResponse.json(
      { error: "Failed to get current user." },
      { status: 500 },
    );
  }
}
