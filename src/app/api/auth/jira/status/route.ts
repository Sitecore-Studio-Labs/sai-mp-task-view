import { NextRequest, NextResponse } from "next/server";
import { hasUserJiraConnection } from "@/services/jiraService";

export async function GET(request: NextRequest) {
  const userId = request.cookies.get("jira_user_id")?.value;
  if (!userId) {
    return NextResponse.json({ connected: false });
  }
  try {
    const connected = await hasUserJiraConnection(userId);
    return NextResponse.json({ connected });
  } catch {
    return NextResponse.json({ connected: false });
  }
}
