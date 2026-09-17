import { PlatformApiError } from "@mp/task-core";
import { NextRequest, NextResponse } from "next/server";

import { JiraAuthError } from "@/exceptions/jiraErrors";
import { clearJiraCookie } from "@/helpers/cookies";
import { getJiraUserIdFromSession } from "@/helpers/jiraUserId";
import { createJiraTokenStore } from "@/lib/tokenStore";

export async function GET(request: NextRequest) {
  try {
    const userId = await getJiraUserIdFromSession(request);
    if (!userId) return NextResponse.json({ error: "No active Jira connection." }, { status: 404 });

    const connection = await createJiraTokenStore().getConnection(userId);

    if (!connection) {
      // User has not connected Jira yet; return successful empty payload instead of 404.
      return NextResponse.json({ resources: [], selectedSite: null, selectedProject: null });
    }

    let resources;
    try {
      resources = await getAccessibleResources(connection.token.accessToken);
    } catch {
      return new Response(JSON.stringify({ error: "Failed to fetch accessible resources" }), {
        status: 500,
      });
    }

    return NextResponse.json({
      resources,
      selectedSite: connection.platformSite,
      selectedProject: connection.platformProject,
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
    if (error instanceof PlatformApiError) {
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
