import { NextRequest, NextResponse } from "next/server";

import { clearJiraCookie } from "@/helpers/cookies";
import { getJiraUserIdFromSession } from "@/helpers/jiraUserId";
import { authStrategy } from "@/lib/authStrategy";

export async function POST(request: NextRequest) {
  const userId = await getJiraUserIdFromSession(request);
  if (!userId) return NextResponse.json({ error: "No active Jira connection." }, { status: 404 });
  try {
    await authStrategy.revoke(userId);
    await clearJiraCookie();
    return NextResponse.json({ success: true });
  } catch (error) {
    console.error("Disconnect failed:", error);
    return NextResponse.json({ error: "Failed to disconnect" }, { status: 500 });
  }
}
