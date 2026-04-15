import { NextRequest, NextResponse } from "next/server";

import { handlePlatformError } from "@/helpers/platformRouteError";
import { getPlatformUserIdFromSession } from "@/helpers/platformUserId";
import { getPrioritiesForUser } from "@/services/platformService";

export async function GET(request: NextRequest) {
  const userId = await getPlatformUserIdFromSession(request);
  if (!userId) return NextResponse.json({ error: "No active connection." }, { status: 404 });

  const projectId = request.nextUrl.searchParams.get("projectId") ?? undefined;

  try {
    const priorities = await getPrioritiesForUser(userId, projectId);
    return NextResponse.json(priorities);
  } catch (error) {
    return handlePlatformError(error, "Failed to load priorities");
  }
}
