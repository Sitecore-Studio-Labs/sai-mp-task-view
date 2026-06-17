import { NextRequest, NextResponse } from "next/server";

import { getWrikeUserIdFromSession } from "@/helpers/wrikeUserId";
import { completeUserSetup, getUserSetup } from "@/services/wrikeSetupService";

export async function POST(request: NextRequest): Promise<NextResponse> {
  try {
    const userId = await getWrikeUserIdFromSession(request);
    if (!userId) return NextResponse.json({ error: "Not authenticated." }, { status: 401 });

    const setup = await getUserSetup(userId);
    if (!setup) {
      return NextResponse.json(
        { error: "Setup record not found. Complete setup configuration first." },
        { status: 404 },
      );
    }

    await completeUserSetup(userId);
    return NextResponse.json({ success: true });
  } catch (error) {
    console.error("Failed to complete setup:", error);
    return NextResponse.json({ error: "Failed to complete setup." }, { status: 500 });
  }
}
