import { NextRequest, NextResponse } from "next/server";

import { JiraAuthError } from "@/exceptions/jiraErrors";
import { clearJiraCookie } from "@/helpers/cookies";
import { getJiraUserIdFromSession } from "@/helpers/jiraUserId";
import { JiraClientError } from "@/platforms/jira/JiraAdapter";
import { completeUserSetup, getUserSetup } from "@/services/jiraService";

export async function POST(request: NextRequest): Promise<NextResponse> {
  try {
    const userId = await getJiraUserIdFromSession(request);
    if (!userId) {
      return NextResponse.json({ error: "No active Jira connection." }, { status: 401 });
    }

    const setup = await getUserSetup(userId);
    if (!setup) {
      return NextResponse.json(
        { error: "Setup record not found. Complete setup configuration first." },
        { status: 404 },
      );
    }

    await completeUserSetup(userId);
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
    if (error instanceof JiraClientError) {
      return NextResponse.json({ error: error.message }, { status: error.statusCode });
    }
    console.error("Failed to complete setup:", error);
    return NextResponse.json({ error: "Failed to complete setup." }, { status: 500 });
  }
}
