import { NextRequest, NextResponse } from "next/server";

import { JiraAuthError } from "@/exceptions/jiraErrors";
import { clearJiraCookie } from "@/helpers/cookies";
import { resolveJiraUserIdFromRequest } from "@/helpers/jiraUserId";
import { refreshUserJiraToken } from "@/services/jiraService";

/**
 * Refresh endpoint used by the axios interceptors.
 * It refreshes the Jira access token for the current user and
 * returns the new PlatformToken.
 */
export async function POST(request: NextRequest) {
  // For this starter we again assume a single demo user. Replace with your auth integration.
  const userId = await resolveJiraUserIdFromRequest(request, { emptyValue: "" });
  if (!userId) {
    return NextResponse.json(
      { error: "Jira session has expired. Please reconnect Jira." },
      { status: 401 },
    );
  }

  try {
    const newToken = await refreshUserJiraToken(userId);
    return NextResponse.json(newToken);
  } catch (error) {
    if (error instanceof JiraAuthError) {
      await clearJiraCookie();
      return NextResponse.json({ error: error.message }, { status: 401 });
    }

    console.error("Failed to refresh Jira token:", error);

    await clearJiraCookie();

    return NextResponse.json(
      { error: "Jira session has expired. Please reconnect Jira." },
      { status: 401 },
    );
  }
}
