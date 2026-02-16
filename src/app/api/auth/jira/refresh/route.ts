import { NextResponse } from "next/server";
import { refreshUserJiraToken } from "@/services/jiraService";

/**
 * Refresh endpoint used by the axios interceptors.
 * It refreshes the Jira access token for the current user and
 * returns the new PlatformToken.
 */
export async function POST() {
  // For this starter we again assume a single demo user. Replace with your auth integration.
  const demoUserId = "00000000-0000-0000-0000-000000000001";

  try {
    const newToken = await refreshUserJiraToken(demoUserId);
    return NextResponse.json(newToken);
  } catch (error) {
    // eslint-disable-next-line no-console
    console.error("Failed to refresh Jira token:", error);
    return NextResponse.json({ error: "Failed to refresh Jira token." }, { status: 500 });
  }
}

