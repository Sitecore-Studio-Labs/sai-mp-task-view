import { NextRequest } from "next/server";

import { createSupabaseServerClient } from "@/lib/supabaseClient";

type ResolveJiraUserIdOptions = {
  emptyValue?: string;
  logPrefix?: string;
};

export async function resolveJiraUserIdFromRequest(
  request: NextRequest,
  options: ResolveJiraUserIdOptions = {},
): Promise<string> {
  const { emptyValue = "", logPrefix = "[jira]" } = options;
  const cookieUserId = request.cookies.get("jira_user_id")?.value || "";
  if (cookieUserId) return cookieUserId;

  if (process.env.NODE_ENV === "production") return emptyValue;

  const supabase = createSupabaseServerClient();
  const { data: fallback } = await supabase
    .from("jira_connections")
    .select("user_id")
    .eq("status", "active")
    .order("updated_at", { ascending: false })
    .limit(1)
    .maybeSingle();

  const fallbackUserId = fallback?.user_id ?? "";
  console.warn(`${logPrefix} Missing jira_user_id cookie; using dev fallback user`, {
    hasFallbackUser: !!fallbackUserId,
  });

  return fallbackUserId || emptyValue;
}
