import { PlatformApiError } from "@mp/task-core";
import { NextRequest, NextResponse } from "next/server";

import { JiraAuthError } from "@/exceptions/jiraErrors";
import { clearJiraCookie } from "@/helpers/cookies";
import { getJiraUserIdFromSession } from "@/helpers/jiraUserId";
import { createSupabaseServerClient } from "@/lib/supabaseClient";

export async function POST(request: NextRequest) {
  try {
    const userId = await getJiraUserIdFromSession(request);
    if (!userId) return NextResponse.json({ error: "No active Jira connection." }, { status: 404 });

    let cloudId: string;
    try {
      const body = await request.json();
      cloudId = body.siteId;
    } catch {
      return NextResponse.json({ error: "Invalid JSON body" }, { status: 400 });
    }

    if (!cloudId)
      return NextResponse.json({ error: "Missing required field: siteId" }, { status: 400 });

    const supabase = createSupabaseServerClient();

    const { error } = await supabase
      .from("jira_connections")
      .update({ jira_site: cloudId, jira_project: "", updated_at: new Date().toISOString() })
      .eq("user_id", userId)
      .eq("status", "active");

    if (error)
      return NextResponse.json(
        { error: `Failed to update site: ${error.message}` },
        { status: 500 },
      );

    return NextResponse.json({ success: true });
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
