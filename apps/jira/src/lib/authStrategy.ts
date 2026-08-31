import { createAuthStrategy } from "@mp/auth";

import { env } from "./config";
import { createJiraTokenStore } from "./tokenStore";

export const authStrategy = createAuthStrategy({
  type: "oauth2-refresh",
  oauth2: {
    authorizeUrl: "https://auth.atlassian.com/authorize",
    tokenUrl: "https://auth.atlassian.com/oauth/token",
    scopes: [
      "read:jira-user",
      "read:jira-work",
      "write:jira-work",
      "manage:jira-webhook",
      "offline_access",
    ],
    extraParams: {
      audience: "api.atlassian.com",
      prompt: "consent",
    },
    rotatingRefreshToken: true,
    clientId: env.JIRA_CLIENT_ID,
    clientSecret: env.JIRA_CLIENT_SECRET,
    redirectUri: env.JIRA_REDIRECT_URI,
  },
  tokenStore: createJiraTokenStore(),
});
