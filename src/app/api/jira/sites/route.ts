import { NextRequest, NextResponse } from "next/server";

import { JiraAuthError } from "@/exceptions/jiraErrors";
import { clearJiraCookie } from "@/helpers/cookies";
import { resolveJiraUserIdFromRequest } from "@/helpers/jiraUserId";
import { createSupabaseServerClient } from "@/lib/supabaseClient";
import { JiraClientError } from "@/platforms/jira/JiraAdapter";
import { decrypt } from "@/utils/encryption";

export async function GET(request: NextRequest) {
  try {
    const userId = await resolveJiraUserIdFromRequest(request, { logPrefix: "[jira/sites]" });
    if (!userId) return NextResponse.json({ resources: [], selectedSite: "" });
    const supabase = createSupabaseServerClient();

    const { data, error } = await supabase
      .from("jira_connections")
      .select("jira_site, access_token_encrypted")
      .eq("user_id", userId)
      .eq("status", "active")
      .order("updated_at", { ascending: false })
      .limit(1)
      .maybeSingle();

    if (error || !data) {
      console.warn("[jira/sites] No active connection for user", { userId, hasError: !!error });
      return NextResponse.json({ resources: [], selectedSite: "" });
    }

    let token;
    try {
      token = { accessToken: decrypt(data.access_token_encrypted) };
    } catch {
      return new Response(JSON.stringify({ error: "Failed to decrypt access token" }), {
        status: 500,
      });
    }

    let resources;
    try {
      resources = await getAccessibleResources(token.accessToken);
    } catch {
      return new Response(JSON.stringify({ error: "Failed to fetch accessible resources" }), {
        status: 500,
      });
    }

    return new Response(JSON.stringify({ resources, selectedSite: data.jira_site }), {
      status: 200,
    });
  } catch (error) {
    if (error instanceof JiraAuthError) {
      await clearJiraCookie();
      return NextResponse.json({ error: error.message }, { status: 401 });
    }
    const message = error instanceof Error ? error.message : "";
    if (message === "No active Jira connection found for user.") {
      await clearJiraCookie();
      return NextResponse.json({ error: "No active Jira connection." }, { status: 401 });
    }
    if (error instanceof JiraClientError) {
      return NextResponse.json({ error: error.message }, { status: error.statusCode });
    }
    console.error("Failed to create Jira issue:", error);
    return NextResponse.json({ error: "Failed to create Jira issue." }, { status: 500 });
  }
}

async function getAccessibleResources(
  token: string,
): Promise<Array<{ id: string; name: string; url: string }>> {
  const res = await fetch("https://api.atlassian.com/oauth/token/accessible-resources", {
    headers: {
      Authorization: `Bearer ${token}`,
      Accept: "application/json",
    },
  });
  if (!res.ok) {
    throw new Error(`Accessible resources failed: ${res.status}`);
  }
  const data = (await res.json()) as Array<{
    id: string;
    name: string;
    url: string;
  }>;
  return data;
}
