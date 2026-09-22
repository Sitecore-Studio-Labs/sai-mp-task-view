import { NextRequest } from "next/server";

import { JIRA_SESSION_COOKIE } from "@/helpers/cookies";
import { createJiraTokenStore } from "@/lib/tokenStore";

/**
 * Resolves the userId from the Jira session cookie.
 * Returns null if the request has no valid session (user not connected).
 */
export async function getJiraUserIdFromSession(request: NextRequest): Promise<string | null> {
  const sessionToken = request.cookies.get(JIRA_SESSION_COOKIE)?.value;
  if (!sessionToken) return null;
  try {
    const store = createJiraTokenStore();
    const session = await store.lookupSession(sessionToken);
    return session?.accountId ?? null;
  } catch (error) {
    console.error("[jiraUserId] Session lookup failed:", error);
    return null;
  }
}
