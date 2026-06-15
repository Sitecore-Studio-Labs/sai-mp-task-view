import { SupabaseTokenStore } from "@mp/token-storage";
import { type NextRequest, NextResponse } from "next/server";

import { clearWrikeCookie } from "@/helpers/cookies";
import { getWrikeUserIdFromSession } from "@/helpers/wrikeUserId";
import { authStrategy } from "@/lib/authStrategy";
import { WRIKE_STORE_CONFIG } from "@/lib/storeConfig";
import { createSupabaseServerClient } from "@/lib/supabaseClient";

export async function POST(request: NextRequest) {
  const userId = await getWrikeUserIdFromSession(request);
  if (userId) {
    await authStrategy.revoke(userId);
    const store = new SupabaseTokenStore(createSupabaseServerClient(), WRIKE_STORE_CONFIG);
    await store.deleteSessionsForUser(userId);
  }
  await clearWrikeCookie();
  return NextResponse.json({ ok: true });
}
