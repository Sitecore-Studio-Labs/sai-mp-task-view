import { NextRequest, NextResponse } from "next/server";
import { cookies } from "next/headers";
import { getJiraCurrentUser } from "@/services/jiraService";
import { JiraAuthError } from "@/exceptions/jiraErrors";

export async function GET(request: NextRequest) {
  const userId = request.cookies.get("jira_user_id")?.value || "";

  try {
    const user = await getJiraCurrentUser(userId);
    return NextResponse.json(user);
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
    
    console.error("Failed to get Jira current user:", error);
    return NextResponse.json(
      { error: "Failed to get current user." },
      { status: 500 },
    );
  }
}
