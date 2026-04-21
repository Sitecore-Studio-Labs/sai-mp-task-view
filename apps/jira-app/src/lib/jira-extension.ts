import { createJiraExtensionProvider } from "@sai-mp-jira-task-view/jira-providers";

import { getCurrentPlatformToken, refreshJiraAccessToken } from "@/lib/axiosClient";

/**
 * PHASE 3.3 — Jira-specific BFF surface. Hooks that need issues meta / CRUD must use this,
 * not {@link TaskPlatformProvider}.
 */
export const jiraExtension = createJiraExtensionProvider({
  getAccessToken: () => getCurrentPlatformToken()?.accessToken ?? null,
  onUnauthorized: async () => {
    await refreshJiraAccessToken();
  },
});
