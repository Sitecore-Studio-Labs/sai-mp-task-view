import { NextRequest, NextResponse } from "next/server";

import { getJiraUserIdFromSession } from "@/helpers/jiraUserId";
import { authStrategy } from "@/lib/authStrategy";

export async function GET(request: NextRequest) {
  const userId = await getJiraUserIdFromSession(request);
  if (!userId) {
    return NextResponse.json({ connected: false });
  }
  const result = await authStrategy.status(userId);
  return NextResponse.json(result);
}
