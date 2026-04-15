import { NextRequest, NextResponse } from "next/server";

import { handlePlatformError } from "@/helpers/platformRouteError";
import { getPlatformUserIdFromSession } from "@/helpers/platformUserId";
import { getStatusesForProject } from "@/services/platformService";

export async function GET(request: NextRequest) {
  const userId = await getPlatformUserIdFromSession(request);
  if (!userId) return NextResponse.json({ error: "No active connection." }, { status: 404 });

  const projectId = request.nextUrl.searchParams.get("projectId");
  if (!projectId) {
    return NextResponse.json(
      { error: "Missing required query parameter: projectId" },
      { status: 400 },
    );
  }

  try {
    const statuses = await getStatusesForProject(userId, projectId);
    return NextResponse.json(statuses);
  } catch (error) {
    return handlePlatformError(error, "Failed to fetch statuses");
  }
}
