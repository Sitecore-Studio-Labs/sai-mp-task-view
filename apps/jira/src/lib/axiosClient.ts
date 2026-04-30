import { createPlatformApiClient } from "@mp/shared";

export const {
  apiClient,
  setCurrentPlatformToken,
  getCurrentPlatformToken,
  setOnAuthFailureCallback,
} = createPlatformApiClient({
  refreshUrl: "/api/auth/jira/refresh",
});
