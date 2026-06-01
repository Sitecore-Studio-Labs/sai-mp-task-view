import type { PlatformSetupResponse, UpsertPlatformSetupPayload } from "@mp/task-core";
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

export async function GET(request: NextRequest): Promise<NextResponse> {
  try {
    const userId = await getJiraUserIdFromSession(request);
    if (!userId) {
      return NextResponse.json<PlatformSetupResponse>({
        connected: false,
        setup: null,
        mappings: [],
      });
    }

    const connected = await hasUserJiraConnection(userId);
    if (!connected) {
      return NextResponse.json<PlatformSetupResponse>({
        connected: false,
        setup: null,
        mappings: [],
      });
    }

    const [setup, mappings] = await Promise.all([
      getUserSetup(userId),
      getUserSetupMappings(userId),
    ]);

    return NextResponse.json<PlatformSetupResponse>({ connected: true, setup, mappings });
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

export async function POST(request: NextRequest): Promise<NextResponse> {
  try {
    const userId = await getJiraUserIdFromSession(request);
    if (!userId) {
      return NextResponse.json({ error: "No active Jira connection." }, { status: 401 });
    }

    let body: UpsertPlatformSetupPayload;
    try {
      body = (await request.json()) as UpsertPlatformSetupPayload;
    } catch {
      return NextResponse.json({ error: "Invalid JSON body." }, { status: 400 });
    }

    const hasScopeSelections = body.scopeSelections && Object.keys(body.scopeSelections).length > 0;
    const hasLegacyFields =
      body.siteId && body.siteUrl && body.defaultProjectId && body.defaultProjectKey;

    if (!hasScopeSelections && !hasLegacyFields) {
      return NextResponse.json(
        {
          error:
            "Missing required fields: scopeSelections or legacy siteId, siteUrl, defaultProjectId, defaultProjectKey.",
        },
        { status: 400 },
      );
    }

    if (hasScopeSelections && !body.taskListScopeLevelId) {
      return NextResponse.json(
        { error: "Missing required field: taskListScopeLevelId." },
        { status: 400 },
      );
    }

    const { siteId, siteUrl, defaultProjectId, defaultProjectKey } = body;
    if (!hasScopeSelections && (!siteId || !siteUrl || !defaultProjectId || !defaultProjectKey)) {
      return NextResponse.json(
        {
          error: "Missing required fields: siteId, siteUrl, defaultProjectId, defaultProjectKey.",
        },
        { status: 400 },
      );
    }

    const connection = await getUserJiraConnection(userId);
    const setup = await upsertUserSetup(userId, connection.connectionId, body);

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
