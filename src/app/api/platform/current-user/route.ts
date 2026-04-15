import { NextRequest, NextResponse } from "next/server";

import { handlePlatformError } from "@/helpers/platformRouteError";
import { getPlatformUserIdFromSession } from "@/helpers/platformUserId";
import { getCurrentUserForPlatform } from "@/services/platformService";

export async function GET(request: NextRequest) {
  const userId = await getPlatformUserIdFromSession(request);
  if (!userId) return NextResponse.json({ error: "No active connection." }, { status: 404 });

  try {
    const user = await getCurrentUserForPlatform(userId);
    return NextResponse.json(user);
  } catch (error) {
    return handlePlatformError(error, "Failed to fetch current user");
  }
}
