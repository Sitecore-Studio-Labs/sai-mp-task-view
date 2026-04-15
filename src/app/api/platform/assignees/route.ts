import { NextRequest, NextResponse } from "next/server";

import { handlePlatformError } from "@/helpers/platformRouteError";
import { getPlatformUserIdFromSession } from "@/helpers/platformUserId";
import { searchAssigneesForUser } from "@/services/platformService";

export async function GET(request: NextRequest) {
  const userId = await getPlatformUserIdFromSession(request);
  if (!userId) return NextResponse.json({ error: "No active connection." }, { status: 404 });

  const projectId = request.nextUrl.searchParams.get("projectId");
  const query = request.nextUrl.searchParams.get("query") ?? undefined;

  if (!projectId) {
    return NextResponse.json(
      { error: "Missing required query parameter: projectId" },
      { status: 400 },
    );
  }

  try {
    const users = await searchAssigneesForUser(userId, {
      projectId,
      query: query?.trim() || undefined,
    });
    return NextResponse.json(users);
  } catch (error) {
    return handlePlatformError(error, "Failed to search assignees");
  }
}
