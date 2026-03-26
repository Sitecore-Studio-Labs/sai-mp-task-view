import { NextRequest, NextResponse } from "next/server";

import { JiraAuthError } from "@/exceptions/jiraErrors";
import { clearJiraCookie } from "@/helpers/cookies";
import { createSupabaseServerClient } from "@/lib/supabaseClient";
import { JiraClientError } from "@/platforms/jira/JiraAdapter";
import { decrypt } from "@/utils/encryption";

export async function GET(request: NextRequest) {
  try {
    const userId = request.cookies.get("jira_user_id")?.value || "";

    const supabase = createSupabaseServerClient();

    const { data, error } = await supabase
      .from("jira_connections")
      .select("jira_site, jira_project, access_token_encrypted")
      .eq("user_id", userId)
      .eq("status", "active")
      .maybeSingle();

    if (error) {
      console.error("Failed to query Jira connection:", error);
      return new Response(JSON.stringify({ error: "Failed to fetch Jira connection" }), {
        status: 500,
      });
    }

    if (!data) {
      // User has not connected Jira yet; return successful empty payload instead of 404.
      return NextResponse.json({ resources: [], selectedSite: null, selectedProject: null });
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

    return NextResponse.json({
      resources,
      selectedSite: data.jira_site,
      selectedProject: data.jira_project,
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
