import type { PlatformToken } from "@mp/task-core";
import { SupabaseTokenStore } from "@mp/token-storage";

import { authStrategy } from "@/lib/authStrategy";
import { getSiteOverride } from "@/lib/siteOverrideContext";
import { WRIKE_STORE_CONFIG } from "@/lib/storeConfig";
import { createSupabaseServerClient } from "@/lib/supabaseClient";
import { WrikeAdapter } from "@/platforms/wrike/WrikeAdapter";

export type WrikeApiContext = {
  adapter: WrikeAdapter;
  token: PlatformToken;
  /**
   * The resolved site/tenant for this request: the user's temporary UI selection
   * when present, otherwise the persisted connection site. Use it according to the
   * platform's tenancy model (see the comment in getWrikeApiContext):
   * host/path-tenant platforms already fold it into the base URL; param-tenant
   * platforms should pass it into adapter calls (e.g. as a workspace/team argument).
   */
  siteId: string;
};

/**
 * Resolves API base URL + bearer token for the connected Wrike user.
 * Called at the start of every WrikeServiceAdapter method:
 *   const { adapter, token, siteId } = await getWrikeApiContext(this.userId);
 *
 * Token refresh is handled automatically by authStrategy.getValidToken().
 * Throws "No active Wrike connection found for user." if not connected.
 *
 * Add named exports to this file only when API routes need to call the adapter
 * directly outside of WrikeServiceAdapter (e.g. an OAuth callback, a
 * disconnect endpoint, or a webhook handler).
 */
export async function getWrikeApiContext(userId: string): Promise<WrikeApiContext> {
  const store = new SupabaseTokenStore(createSupabaseServerClient(), WRIKE_STORE_CONFIG);
  const connection = await store.getConnection(userId);
  if (!connection) throw new Error("No active Wrike connection found for user.");

  const accessToken = await authStrategy.getValidToken(userId);
  // refreshToken and expiry are optional — undefined for API-key / non-expiring platforms.
  const token: PlatformToken = {
    accessToken,
    refreshToken: connection.token.refreshToken,
    expiry: connection.token.expiry,
    tokenType: "bearer",
  };

  // Resolve the active site/tenant: the per-request UI selection wins, then the
  // persisted connection site. This keeps persistence as the default while letting a
  // temporary site switch take effect for this request only.
  const siteId = getSiteOverride() ?? connection.platformSite;

  // TODO: Construct the API base URL. Platforms model multi-tenancy in two ways —
  // pick the one that matches Wrike:
  //
  // (1) HOST/PATH TENANT — the site is part of the base URL. Build it from `siteId`:
  //       Jira Cloud:  `https://api.atlassian.com/ex/jira/${siteId}`   (siteId = cloudId UUID
  //                    from /oauth/token/accessible-resources; one token spans many sites)
  //       Wrike:       `https://${siteId}/api/v4`                      (siteId = `host` from the
  //                    OAuth token response, e.g. "app-us2.wrike.com"; data is region-pinned)
  //
  // (2) PARAM TENANT — the base URL is a fixed constant and the workspace/team travels as a
  //     request argument. Hardcode `baseUrl` and pass `siteId` into adapter calls instead
  //     (it is returned below so WrikeServiceAdapter can forward it):
  //       Asana:    "https://app.asana.com/api/1.0"   -> `?workspace=${siteId}` on scoped calls
  //       ClickUp:  "https://api.clickup.com/api/v2"  -> `/team/${siteId}/...`
  //       Trello:   "https://api.trello.com/1"        -> `/organizations/${siteId}/...`
  //       monday:   "https://api.monday.com/v2"       -> single account per token (GraphQL);
  //                 `siteId` is normally unused (no site switching)
  //
  // The default below assumes a host-tenant platform (Wrike-shaped). Replace it for the
  // model above that fits — but keep `siteId` in the returned context either way.
  const baseUrl = siteId.startsWith("http") ? siteId : `https://${siteId}`;
  const adapter = new WrikeAdapter(baseUrl);
  return { adapter, token, siteId };
}
// Setup wizard CRUD functions are in src/services/wrikeSetupService.ts
// (generated alongside this file when hasSetupWizard: true).
// Import from there: getUserSetup, upsertUserSetup, completeUserSetup,
//                    getUserSetupMappings, upsertUserSetupMappings, hasUserConnection.
