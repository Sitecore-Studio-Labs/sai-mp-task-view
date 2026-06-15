import { createAuthStrategy } from "@mp/auth";
import { SupabaseTokenStore } from "@mp/token-storage";
import { createClient } from "@supabase/supabase-js";

import { env } from "./config";

export const authStrategy = createAuthStrategy({
  type: "oauth2-refresh",
  oauth2: {
    authorizeUrl: "https://login.wrike.com/oauth2/authorize/v4",
    tokenUrl: "https://login.wrike.com/oauth2/token",
    scopeSeparator: ", ",
    scopes: ["Default", "wsReadWrite", "amReadOnlyWorkflow"],
    rotatingRefreshToken: true,
    clientId: env.WRIKE_CLIENT_ID,
    clientSecret: env.WRIKE_CLIENT_SECRET,
    redirectUri: env.WRIKE_REDIRECT_URI,
  },
  tokenStore: new SupabaseTokenStore(
    createClient(env.NEXT_PUBLIC_SUPABASE_URL, env.SUPABASE_SERVICE_ROLE_KEY),
    {
      connectionsTable: "wrike_connections",
      sessionsTable: "wrike_sessions",
      siteColumn: "wrike_site",
      projectColumn: "wrike_project",
      accountIdColumn: "wrike_account_id",
    },
  ),
});
