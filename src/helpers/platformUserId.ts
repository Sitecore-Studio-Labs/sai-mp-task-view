import { NextRequest } from "next/server";

import { createSupabaseServerClient } from "@/lib/supabaseClient";

/**
 * Resolves the platform user ID from the session cookie.
 * Until Phase 3 renames the tables/cookies, this reads the existing
 * `jira_session_token` cookie and `jira_sessions` table.
 */
export async function getPlatformUserIdFromSession(request: NextRequest): Promise<string | null> {
  // Support both the new cookie name and the legacy one during transition
  const sessionToken =
    request.cookies.get("platform_session_token")?.value ||
    request.cookies.get("jira_session_token")?.value ||
    "";

  if (!sessionToken) return null;

  const supabase = createSupabaseServerClient();
  const { data, error } = await supabase
    .from("jira_sessions")
    .select("jira_account_id, expires_at")
    .eq("session_token", sessionToken)
    .maybeSingle();

  if (error || !data) return null;

  const expiresAt = new Date(data.expires_at);
  if (isNaN(expiresAt.getTime()) || expiresAt.getTime() < Date.now()) {
    return null;
  }

  return data.jira_account_id;
}
