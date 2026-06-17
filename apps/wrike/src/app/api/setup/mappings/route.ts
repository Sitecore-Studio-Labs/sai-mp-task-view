import type { UpsertPlatformSetupMappingsPayload } from "@mp/task-core";
import { NextRequest, NextResponse } from "next/server";

import { getWrikeUserIdFromSession } from "@/helpers/wrikeUserId";
import {
  getUserConnection,
  getUserSetupMappings,
  upsertUserSetupMappings,
} from "@/services/wrikeSetupService";

export async function GET(request: NextRequest): Promise<NextResponse> {
  try {
    const userId = await getWrikeUserIdFromSession(request);
    if (!userId) return NextResponse.json({ error: "Not authenticated." }, { status: 401 });
    const mappings = await getUserSetupMappings(userId);
    return NextResponse.json(mappings);
  } catch (error) {
    console.error("Failed to fetch setup mappings:", error);
    return NextResponse.json({ error: "Failed to fetch setup mappings." }, { status: 500 });
  }
}

export async function PUT(request: NextRequest): Promise<NextResponse> {
  try {
    const userId = await getWrikeUserIdFromSession(request);
    if (!userId) return NextResponse.json({ error: "Not authenticated." }, { status: 401 });

    let body: UpsertPlatformSetupMappingsPayload;
    try {
      body = (await request.json()) as UpsertPlatformSetupMappingsPayload;
    } catch {
      return NextResponse.json({ error: "Invalid JSON body." }, { status: 400 });
    }

    if (!Array.isArray(body?.mappings)) {
      return NextResponse.json({ error: "Body must contain a 'mappings' array." }, { status: 400 });
    }

    for (const m of body.mappings) {
      if (!m.externalResourceId || !m.projectId || !m.projectKey) {
        return NextResponse.json(
          { error: "Each mapping must include externalResourceId, projectId, and projectKey." },
          { status: 400 },
        );
      }
    }

    const connection = await getUserConnection(userId);
    const mappings = await upsertUserSetupMappings(userId, connection.connectionId, body.mappings);
    return NextResponse.json(mappings);
  } catch (error) {
    console.error("Failed to update setup mappings:", error);
    return NextResponse.json({ error: "Failed to update setup mappings." }, { status: 500 });
  }
}
