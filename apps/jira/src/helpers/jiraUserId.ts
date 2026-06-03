import { NextRequest } from "next/server";

import { JIRA_SESSION_COOKIE } from "@/helpers/cookies";
import { createSupabaseServerClient } from "@/lib/supabaseClient";

export async function getJiraUserIdFromSession(request: NextRequest) {
  const sessionToken = request.cookies.get(JIRA_SESSION_COOKIE)?.value || "";

  if (!sessionToken) return null;

  const supabase = createSupabaseServerClient();
  const { data, error } = await supabase
    .from("jira_sessions")
    .select("jira_account_id, expires_at")
    .eq("session_token", sessionToken)
    .maybeSingle();

  if (error) {
    console.error("[jiraUserId] Supabase session lookup failed:", error);
    return null;
  }

  if (!data) return null;

  const expiresAt = new Date(data.expires_at);
  if (isNaN(expiresAt.getTime()) || expiresAt.getTime() < Date.now()) {
    return null;
  }

  return data.jira_account_id;
}
