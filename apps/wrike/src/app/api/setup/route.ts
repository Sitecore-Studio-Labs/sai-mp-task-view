import type { PlatformSetupResponse, UpsertPlatformSetupPayload } from "@mp/task-core";
import { NextRequest, NextResponse } from "next/server";

import { getWrikeUserIdFromSession } from "@/helpers/wrikeUserId";
import {
  getUserConnection,
  getUserSetup,
  getUserSetupMappings,
  hasUserConnection,
  upsertUserSetup,
} from "@/services/wrikeSetupService";

export async function GET(request: NextRequest): Promise<NextResponse> {
  try {
    const userId = await getWrikeUserIdFromSession(request);
    if (!userId)
      return NextResponse.json<PlatformSetupResponse>({
        connected: false,
        setup: null,
        mappings: [],
      });

    const connected = await hasUserConnection(userId);
    if (!connected)
      return NextResponse.json<PlatformSetupResponse>({
        connected: false,
        setup: null,
        mappings: [],
      });

    const [setup, mappings] = await Promise.all([
      getUserSetup(userId),
      getUserSetupMappings(userId),
    ]);
    return NextResponse.json<PlatformSetupResponse>({ connected: true, setup, mappings });
  } catch (error) {
    console.error("Failed to fetch setup:", error);
    return NextResponse.json({ error: "Failed to fetch setup." }, { status: 500 });
  }
}

export async function POST(request: NextRequest): Promise<NextResponse> {
  try {
    const userId = await getWrikeUserIdFromSession(request);
    if (!userId) return NextResponse.json({ error: "Not authenticated." }, { status: 401 });

    let body: UpsertPlatformSetupPayload;
    try {
      body = (await request.json()) as UpsertPlatformSetupPayload;
    } catch {
      return NextResponse.json({ error: "Invalid JSON body." }, { status: 400 });
    }

    const hasScopeSelections = body.scopeSelections && Object.keys(body.scopeSelections).length > 0;
    if (!hasScopeSelections || !body.taskListScopeLevelId) {
      return NextResponse.json(
        { error: "Missing required fields: scopeSelections and taskListScopeLevelId." },
        { status: 400 },
      );
    }

    const connection = await getUserConnection(userId);
    const setup = await upsertUserSetup(userId, connection.connectionId, body);
    return NextResponse.json(setup, { status: 200 });
  } catch (error) {
    console.error("Failed to save setup:", error);
    return NextResponse.json({ error: "Failed to save setup." }, { status: 500 });
  }
}
