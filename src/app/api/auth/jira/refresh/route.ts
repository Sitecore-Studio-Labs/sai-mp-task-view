import { NextRequest, NextResponse } from "next/server";
import { refreshUserJiraToken } from "@/services/jiraService";

/**
 * Refresh endpoint used by the axios interceptors.
 * It refreshes the Jira access token for the current user and
 * returns the new PlatformToken.
 */
export async function POST(request: NextRequest) {
  // For this starter we again assume a single demo user. Replace with your auth integration.
  const userId = request.cookies.get("jira_user_id")?.value || "";

  try {
    const newToken = await refreshUserJiraToken(userId);
    return NextResponse.json(newToken);
  } catch (error) {
     
    console.error("Failed to refresh Jira token:", error);
    return NextResponse.json(
      { error: "Failed to refresh Jira token." },
      { status: 500 },
    );
  }
}
