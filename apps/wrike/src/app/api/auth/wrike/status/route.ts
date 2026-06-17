import { type NextRequest, NextResponse } from "next/server";

import { getWrikeUserIdFromSession } from "@/helpers/wrikeUserId";
import { authStrategy } from "@/lib/authStrategy";

export async function GET(request: NextRequest) {
  const userId = await getWrikeUserIdFromSession(request);
  if (!userId) return NextResponse.json({ connected: false });
  const result = await authStrategy.status(userId);
  return NextResponse.json(result);
}
