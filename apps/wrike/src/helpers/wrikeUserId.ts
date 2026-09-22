import { NextRequest } from "next/server";

import { WRIKE_SESSION_COOKIE } from "@/helpers/cookies";
import { createWrikeTokenStore } from "@/lib/tokenStore";

/**
 * Resolves the userId from the Wrike session cookie.
 * Returns null if the request has no valid session (user not connected).
 * Used by withAdapter in platformRoute.ts.
 */
export async function getWrikeUserIdFromSession(request: NextRequest): Promise<string | null> {
  const sessionToken = request.cookies.get(WRIKE_SESSION_COOKIE)?.value;
  if (!sessionToken) return null;
  const store = createWrikeTokenStore();
  const session = await store.lookupSession(sessionToken);
  return session?.accountId ?? null;
}
