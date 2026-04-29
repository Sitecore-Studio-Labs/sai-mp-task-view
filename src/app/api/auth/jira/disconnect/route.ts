import { NextRequest, NextResponse } from "next/server";

import { JiraAuthError } from "@/exceptions/jiraErrors";
import { clearJiraCookie } from "@/helpers/cookies";
import { getJiraUserIdFromSession } from "@/helpers/jiraUserId";
import { disconnectAndWipeUserJira, disconnectUserJira } from "@/services/jiraService";

/**
 * POST /api/auth/jira/disconnect
 *
 * Body (optional): { wipe?: boolean }
 *   wipe=false (default) — marks the token inactive and clears the session cookie.
 *   wipe=true            — same as above, but also deletes jira_user_setup and
 *                          jira_site_project_mappings
 */
export async function POST(request: NextRequest) {
  const userId = await getJiraUserIdFromSession(request);
  if (!userId) return NextResponse.json({ error: "No active Jira connection." }, { status: 404 });

  let wipe = false;
  try {
    const body = (await request.json()) as { wipe?: boolean };
    wipe = body?.wipe === true;
  } catch {
    // Body is optional; a missing or non-JSON body is not an error.
  }

  try {
    if (wipe) {
      await disconnectAndWipeUserJira(userId);
    } else {
      await disconnectUserJira(userId);
    }
    await clearJiraCookie();
    return NextResponse.json({ success: true });
  } catch (error) {
    if (error instanceof JiraAuthError) {
      await clearJiraCookie();
      return NextResponse.json({ error: error.message }, { status: 401 });
    }

    console.error("Disconnect failed:", error);
    return NextResponse.json({ error: "Failed to disconnect" }, { status: 500 });
  }
}
