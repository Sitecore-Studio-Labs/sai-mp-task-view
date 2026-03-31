import { NextRequest, NextResponse } from "next/server";

import { JiraAuthError } from "@/exceptions/jiraErrors";
import { clearJiraCookie } from "@/helpers/cookies";
import { getJiraUserIdFromSession } from "@/helpers/jiraUserId";
import { disconnectUserJira } from "@/services/jiraService";

export async function POST(request: NextRequest) {
  const userId = await getJiraUserIdFromSession(request);
  if (!userId) return NextResponse.json({ error: "No active Jira connection." }, { status: 404 });
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
    return NextResponse.json({ error: "Failed to disconnect" }, { status: 500 });
  }
}
