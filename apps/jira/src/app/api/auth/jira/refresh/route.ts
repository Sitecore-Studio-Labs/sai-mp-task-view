import { rateLimit } from "@mp/shared";
import { NextRequest, NextResponse } from "next/server";

import { JiraAuthError } from "@/exceptions/jiraErrors";
import { clearJiraCookie } from "@/helpers/cookies";
import { getJiraUserIdFromSession } from "@/helpers/jiraUserId";
import { refreshUserJiraToken } from "@/services/jiraService";

/**
 * Refresh endpoint used by the axios interceptors.
 * It refreshes the Jira access token for the current user and
 * returns the new PlatformToken.
 */
export async function POST(request: NextRequest) {
  const userId = await getJiraUserIdFromSession(request);
  if (!userId) return NextResponse.json({ error: "No active Jira connection." }, { status: 401 });

  const limitKey = `refresh:${userId}`;
  const { allowed, retryAfter } = rateLimit(limitKey, 30, 60_000);
  if (!allowed) {
    return NextResponse.json(
      { error: "Too many requests. Please try again later." },
      { status: 429, headers: { "Retry-After": String(retryAfter) } },
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
