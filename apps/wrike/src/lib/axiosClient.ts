import { createPlatformApiClient } from "@mp/shared";

export const {
  apiClient,
  setCurrentPlatformToken,
  getCurrentPlatformToken,
  setOnAuthFailureCallback,
  setCurrentSiteId,
} = createPlatformApiClient({
  refreshUrl: "/api/auth/wrike/refresh",
});
