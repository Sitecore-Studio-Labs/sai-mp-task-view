import { NextRequest } from "next/server";

import { createSupabaseServerClient } from "@/lib/supabaseClient";

export async function getJiraUserIdFromSession(request: NextRequest) {
  const sessionToken = request.cookies.get("jira_session_token")?.value || "";

  if (!sessionToken) return null;

  const supabase = createSupabaseServerClient();
  const { data, error } = await supabase
    .from("jira_sessions")
    .select("jira_account_id, expires_at")
    .eq("session_token", sessionToken)
    .single();

  if (error || !data) return null;

  if (new Date(data.expires_at) < new Date()) {
    return null;
  }

  return data.jira_account_id;
}
