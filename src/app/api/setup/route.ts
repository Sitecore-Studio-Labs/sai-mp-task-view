import { NextRequest, NextResponse } from "next/server";

import { JiraAuthError } from "@/exceptions/jiraErrors";
import { clearJiraCookie } from "@/helpers/cookies";
import { getJiraUserIdFromSession } from "@/helpers/jiraUserId";
import { JiraClientError } from "@/platforms/jira/JiraAdapter";
import {
  getUserJiraConnection,
  getUserSetup,
  getUserSetupMappings,
  hasUserJiraConnection,
  upsertUserSetup,
} from "@/services/jiraService";
import type { SetupResponse, UpsertSetupPayload } from "@/types/setup";

/**
 * GET /api/setup
 *
 * Returns the current user's connection state, setup wizard record, and site-project mappings.
 * Used by the app on load to decide which screen to show:
 */
export async function GET(request: NextRequest): Promise<NextResponse> {
  try {
    const userId = await getJiraUserIdFromSession(request);
    if (!userId) {
      return NextResponse.json<SetupResponse>({ connected: false, setup: null, mappings: [] });
    }

    const connected = await hasUserJiraConnection(userId);
    if (!connected) {
      return NextResponse.json<SetupResponse>({ connected: false, setup: null, mappings: [] });
    }

    const [setup, mappings] = await Promise.all([
      getUserSetup(userId),
      getUserSetupMappings(userId),
    ]);

    return NextResponse.json<SetupResponse>({ connected: true, setup, mappings });
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
    console.error("Failed to fetch setup:", error);
    return NextResponse.json({ error: "Failed to fetch setup." }, { status: 500 });
  }
}

/**
 * POST /api/setup
 *
 * Creates or updates the setup wizard record
 * Does NOT mark the wizard as completed — call POST /api/setup/complete for that.
 *
 * Body: UpsertSetupPayload
 */
export async function POST(request: NextRequest): Promise<NextResponse> {
  try {
    const userId = await getJiraUserIdFromSession(request);
    if (!userId) {
      return NextResponse.json({ error: "No active Jira connection." }, { status: 401 });
    }

    let body: UpsertSetupPayload;
    try {
      body = (await request.json()) as UpsertSetupPayload;
    } catch {
      return NextResponse.json({ error: "Invalid JSON body." }, { status: 400 });
    }

    const { jiraSiteId, jiraSiteUrl, defaultProjectId, defaultProjectKey } = body;

    if (!jiraSiteId || !jiraSiteUrl || !defaultProjectId || !defaultProjectKey) {
      return NextResponse.json(
        {
          error:
            "Missing required fields: jiraSiteId, jiraSiteUrl, defaultProjectId, defaultProjectKey.",
        },
        { status: 400 },
      );
    }

    const connection = await getUserJiraConnection(userId);
    const setup = await upsertUserSetup(userId, connection.connectionId, {
      jiraSiteId: body.jiraSiteId,
      jiraSiteUrl: body.jiraSiteUrl,
      jiraSiteName: body.jiraSiteName,
      defaultProjectId: body.defaultProjectId,
      defaultProjectKey: body.defaultProjectKey,
      defaultProjectName: body.defaultProjectName,
    });

    return NextResponse.json(setup, { status: 200 });
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
    return NextResponse.json({ error: "Failed to save setup." }, { status: 500 });
  }
}
