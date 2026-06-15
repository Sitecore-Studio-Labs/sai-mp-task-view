import { SupabaseTokenStore } from "@mp/token-storage";
import { NextRequest } from "next/server";

import { WRIKE_SESSION_COOKIE } from "@/helpers/cookies";
import { createSupabaseServerClient } from "@/lib/supabaseClient";

const WRIKE_STORE_CONFIG = {
  connectionsTable: "wrike_connections",
  sessionsTable: "wrike_sessions",
  siteColumn: "wrike_site",
  projectColumn: "wrike_project",
  accountIdColumn: "wrike_account_id",
} as const;

/**
 * Resolves the userId from the Wrike session cookie.
 * Returns null if the request has no valid session (user not connected).
 * Used by withAdapter in platformRoute.ts.
 */
export async function getWrikeUserIdFromSession(request: NextRequest): Promise<string | null> {
  const sessionToken = request.cookies.get(WRIKE_SESSION_COOKIE)?.value;
  if (!sessionToken) return null;
  const store = new SupabaseTokenStore(createSupabaseServerClient(), WRIKE_STORE_CONFIG);
  const session = await store.lookupSession(sessionToken);
  return session?.accountId ?? null;
}
