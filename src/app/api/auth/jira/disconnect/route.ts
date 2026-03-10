import { NextRequest, NextResponse } from "next/server";
import { disconnectUserJira } from "@/services/jiraService";
import { JiraAuthError } from "@/exceptions/jiraErrors";
import { clearJiraCookie } from "@/helpers/cookies";

export async function POST(request: NextRequest) {
  const userId = request.cookies.get("jira_user_id")?.value || "";
  try {
    await disconnectUserJira(userId);
    await clearJiraCookie();
    return NextResponse.json({ success: true });
  } catch (error) {
    if (error instanceof JiraAuthError) {
      await clearJiraCookie();
      return NextResponse.json({ error: error.message }, { status: 401 });
    }
     
    console.error("Disconnect failed:", error);
    return NextResponse.json(
      { error: "Failed to disconnect" },
      { status: 500 },
    );
  }
}
