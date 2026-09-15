import { createAuthStrategy } from "@mp/auth";

import { env } from "./config";
import { createWrikeTokenStore } from "./tokenStore";

export const authStrategy = createAuthStrategy({
  type: "oauth2-refresh",
  oauth2: {
    authorizeUrl: "https://login.wrike.com/oauth2/authorize/v4",
    tokenUrl: "https://login.wrike.com/oauth2/token",
    scopeSeparator: ", ",
    scopes: ["Default", "wsReadWrite", "amReadOnlyWorkflow", "amReadOnlyAccessRole"],
    rotatingRefreshToken: true,
    clientId: env.WRIKE_CLIENT_ID,
    clientSecret: env.WRIKE_CLIENT_SECRET,
    redirectUri: env.WRIKE_REDIRECT_URI,
  },
  tokenStore: createWrikeTokenStore(),
});
