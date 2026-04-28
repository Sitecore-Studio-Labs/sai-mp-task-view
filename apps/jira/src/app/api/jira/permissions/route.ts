import { NextRequest, NextResponse } from "next/server";

import { JiraAuthError } from "@/exceptions/jiraErrors";
import { clearJiraCookie } from "@/helpers/cookies";
import { getJiraUserIdFromSession } from "@/helpers/jiraUserId";
import { getPermission } from "@/services/jiraService";

export async function GET(request: NextRequest) {
  const userId = await getJiraUserIdFromSession(request);
  if (!userId) return NextResponse.json({ error: "No active Jira connection." }, { status: 404 });

  const { searchParams } = new URL(request.url);
  const issueIdOrKey = searchParams.get("issueIdOrKey")?.trim();
  const projectKey = searchParams.get("projectKey")?.trim();
  const permission = searchParams.get("permission")?.trim();

  if (!permission) {
    return NextResponse.json({ error: "permission is required" }, { status: 400 });
  }

  if (!issueIdOrKey && !projectKey) {
    return NextResponse.json(
      { error: "Either issueIdOrKey or projectKey is required" },
      { status: 400 },
    );
  }

  try {
    const hasPermission = await getPermission(userId, permission, {
      issueKey: issueIdOrKey || undefined,
      projectKey: projectKey || undefined,
    });

    return NextResponse.json({ hasPermission });
  } catch (error: unknown) {
    if (error instanceof JiraAuthError) {
      await clearJiraCookie();
      return NextResponse.json({ error: error.message }, { status: 401 });
    }

    const message = error instanceof Error ? error.message : "";
    if (message === "No active Jira connection found for user.") {
      await clearJiraCookie();
      return NextResponse.json({ error: "No active Jira connection." }, { status: 401 });
    }
    return NextResponse.json({ error: "Unexpected server error" }, { status: 500 });
  }
}
