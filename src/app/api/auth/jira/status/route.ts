import { NextRequest, NextResponse } from "next/server";
import { hasUserJiraConnection } from "@/services/jiraService";
import { JiraAuthError } from "@/exceptions/jiraErrors";
import { clearJiraCookie } from "@/helpers/cookies";

export async function GET(request: NextRequest) {
  const userId = request.cookies.get("jira_user_id")?.value;
  if (!userId) {
    return NextResponse.json({ connected: false });
  }
  try {
    const connected = await hasUserJiraConnection(userId);
    return NextResponse.json({ connected });
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

    return NextResponse.json({ connected: false });
  }
}
