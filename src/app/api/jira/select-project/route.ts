import { NextRequest, NextResponse } from "next/server";

import { JiraAuthError } from "@/exceptions/jiraErrors";
import { clearJiraCookie } from "@/helpers/cookies";
import { getJiraUserIdFromSession } from "@/helpers/jiraUserId";
import { JiraClientError } from "@/platforms/jira/JiraAdapter";
import { updateUserJiraProject } from "@/services/jiraService";

export async function POST(request: NextRequest) {
  try {
    const userId = await getJiraUserIdFromSession(request);
    if (!userId) return NextResponse.json({ error: "No active Jira connection." }, { status: 404 });

    let projectKey: string;
    try {
      const body = await request.json();
      projectKey = body.projectKey;
    } catch {
      return NextResponse.json({ error: "Invalid JSON body" }, { status: 400 });
    }

    if (!userId || !projectKey) {
      return NextResponse.json({ error: "Missing data" }, { status: 400 });
    }

    await updateUserJiraProject(userId, projectKey);

    return NextResponse.json({ success: true }, { status: 200 });
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

    console.error("Failed to update Jira project:", error);
    return NextResponse.json({ error: "Failed to update Jira project." }, { status: 500 });
  }
}
