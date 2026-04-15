import { NextRequest, NextResponse } from "next/server";

import { handlePlatformError } from "@/helpers/platformRouteError";
import { getPlatformUserIdFromSession } from "@/helpers/platformUserId";
import { getProjectsForUser } from "@/services/platformService";

export async function GET(request: NextRequest) {
  const userId = await getPlatformUserIdFromSession(request);
  if (!userId) return NextResponse.json({ error: "No active connection." }, { status: 404 });

  try {
    const projects = await getProjectsForUser(userId);
    return NextResponse.json(projects);
  } catch (error) {
    return handlePlatformError(error, "Failed to load projects");
  }
}
