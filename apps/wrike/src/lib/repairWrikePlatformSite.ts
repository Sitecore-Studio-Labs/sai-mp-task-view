import type { ConnectionRecord } from "@mp/token-storage";

import { env } from "@/lib/config";
import { createWrikeTokenStore } from "@/lib/tokenStore";
import { normalizeWrikeHost, WRIKE_MISSING_HOST_MESSAGE } from "@/lib/wrikeHost";

const WRIKE_TOKEN_URL = "https://login.wrike.com/oauth2/token";

type WrikeRefreshResponse = {
  access_token?: string;
  refresh_token?: string;
  expires_in?: number;
  host?: string;
};

/**
 * Backfills the `wrike_site` column for connections created before the OAuth
 * callback stored the data-centre host. Wrike includes `host` on token refresh responses.
 */
export async function repairWrikePlatformSite(
  userId: string,
  connection: ConnectionRecord,
): Promise<string> {
  if (!connection.token.refreshToken) {
    throw new Error(WRIKE_MISSING_HOST_MESSAGE);
  }

  const tokenRes = await fetch(WRIKE_TOKEN_URL, {
    method: "POST",
    headers: { "Content-Type": "application/x-www-form-urlencoded" },
    body: new URLSearchParams({
      grant_type: "refresh_token",
      client_id: env.WRIKE_CLIENT_ID,
      client_secret: env.WRIKE_CLIENT_SECRET,
      refresh_token: connection.token.refreshToken,
    }).toString(),
  });

  if (!tokenRes.ok) {
    throw new Error(WRIKE_MISSING_HOST_MESSAGE);
  }

  const tokenData = (await tokenRes.json()) as WrikeRefreshResponse;
  if (!tokenData.access_token || !tokenData.host) {
    throw new Error(WRIKE_MISSING_HOST_MESSAGE);
  }

  const platformSite = normalizeWrikeHost(tokenData.host);
  const expiry = tokenData.expires_in
    ? new Date(Date.now() + tokenData.expires_in * 1000).toISOString()
    : connection.token.expiry;

  const store = createWrikeTokenStore();
  await store.saveConnection({
    userId,
    platformSite,
    platformProject: connection.platformProject,
    token: {
      accessToken: tokenData.access_token,
      refreshToken: tokenData.refresh_token ?? connection.token.refreshToken,
      expiry,
      tokenType: "bearer",
    },
  });

  return platformSite;
}
