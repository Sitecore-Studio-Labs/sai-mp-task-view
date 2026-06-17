import { rateLimit } from "@mp/shared";
import { type NextRequest, NextResponse } from "next/server";

import { getWrikeUserIdFromSession } from "@/helpers/wrikeUserId";
import { authStrategy } from "@/lib/authStrategy";

export async function POST(request: NextRequest) {
  const userId = await getWrikeUserIdFromSession(request);
  if (!userId) return NextResponse.json({ error: "Not authenticated" }, { status: 401 });

  const limitKey = `refresh:${userId}`;
  const { allowed, retryAfter } = rateLimit(limitKey, 30, 60_000);
  if (!allowed) {
    return NextResponse.json(
      { error: "Too many requests. Please try again later." },
      { status: 429, headers: { "Retry-After": String(retryAfter) } },
    );
  }

  await authStrategy.getValidToken(userId);
  return NextResponse.json({ ok: true });
}
