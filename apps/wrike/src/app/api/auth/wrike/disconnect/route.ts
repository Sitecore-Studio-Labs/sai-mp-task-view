import { SupabaseTokenStore } from "@mp/token-storage";
import { type NextRequest, NextResponse } from "next/server";

import { clearWrikeCookie } from "@/helpers/cookies";
import { getWrikeUserIdFromSession } from "@/helpers/wrikeUserId";
import { authStrategy } from "@/lib/authStrategy";
import { WRIKE_STORE_CONFIG } from "@/lib/storeConfig";
import { createSupabaseServerClient } from "@/lib/supabaseClient";
import { disconnectAndWipeUserWrike } from "@/services/wrikeSetupService";

/**
 * POST /api/auth/wrike/disconnect
 *
 * Body (optional): { wipe?: boolean }
 *   wipe=false (default) — revoke token and clear session; setup/mappings kept.
 *   wipe=true            — also deletes wrike_user_setup and wrike_site_project_mappings.
 */
export async function POST(request: NextRequest) {
  const userId = await getWrikeUserIdFromSession(request);

  let wipe = false;
  try {
    const body = (await request.json()) as { wipe?: boolean };
    wipe = body?.wipe === true;
  } catch {
    // Body is optional.
  }

  if (userId) {
    await authStrategy.revoke(userId);
    const store = new SupabaseTokenStore(createSupabaseServerClient(), WRIKE_STORE_CONFIG);
    await store.deleteSessionsForUser(userId);
    if (wipe) {
      await disconnectAndWipeUserWrike(userId);
    }
  }
  await clearWrikeCookie();
  return NextResponse.json({ ok: true });
}
