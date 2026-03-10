import { NextRequest, NextResponse } from "next/server";
import { hasUserJiraConnection } from "@/services/jiraService";
import { cookies } from "next/headers";
import { JiraAuthError } from "@/exceptions/jiraErrors";

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

    return NextResponse.json({ connected: false });
  }
}
