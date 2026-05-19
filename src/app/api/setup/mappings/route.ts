import { NextRequest, NextResponse } from "next/server";

import { JiraAuthError } from "@/exceptions/jiraErrors";
import { clearJiraCookie } from "@/helpers/cookies";
import { getJiraUserIdFromSession } from "@/helpers/jiraUserId";
import { JiraClientError } from "@/platforms/jira/JiraAdapter";
import {
  getUserJiraConnection,
  getUserSetupMappings,
  upsertUserSetupMappings,
} from "@/services/jiraService";
import type { UpsertMappingsPayload } from "@/types/setup";

/**
 * GET /api/setup/mappings
 *
 * Returns all SAI site → Jira project mappings for the current user.
 */
export async function GET(request: NextRequest): Promise<NextResponse> {
  try {
    const userId = await getJiraUserIdFromSession(request);
    if (!userId) {
      return NextResponse.json({ error: "No active Jira connection." }, { status: 401 });
    }

    const mappings = await getUserSetupMappings(userId);
    return NextResponse.json(mappings);
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
    console.error("Failed to fetch setup mappings:", error);
    return NextResponse.json({ error: "Failed to fetch setup mappings." }, { status: 500 });
  }
}

/**
 * PUT /api/setup/mappings
 *
 * Replaces all SAI site → Jira project mappings for the current user.
 * Passing an empty array clears all mappings (Task View will fall back to default project).
 *
 * Body: UpsertMappingsPayload
 */
export async function PUT(request: NextRequest): Promise<NextResponse> {
  try {
    const userId = await getJiraUserIdFromSession(request);
    if (!userId) {
      return NextResponse.json({ error: "No active Jira connection." }, { status: 401 });
    }

    let body: UpsertMappingsPayload;
    try {
      body = (await request.json()) as UpsertMappingsPayload;
    } catch {
      return NextResponse.json({ error: "Invalid JSON body." }, { status: 400 });
    }

    if (!Array.isArray(body?.mappings)) {
      return NextResponse.json({ error: "Body must contain a 'mappings' array." }, { status: 400 });
    }

    for (const m of body.mappings) {
      if (!m.saiSiteId || !m.jiraProjectId || !m.jiraProjectKey) {
        return NextResponse.json(
          { error: "Each mapping must include saiSiteId, jiraProjectId, and jiraProjectKey." },
          { status: 400 },
        );
      }
    }

    const connection = await getUserJiraConnection(userId);
    const mappings = await upsertUserSetupMappings(userId, connection.connectionId, body.mappings);

    return NextResponse.json(mappings);
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
    console.error("Failed to update setup mappings:", error);
    return NextResponse.json({ error: "Failed to update setup mappings." }, { status: 500 });
  }
}
