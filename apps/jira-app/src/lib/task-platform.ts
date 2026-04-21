import {
  createTaskPlatformProvider,
  type TaskPlatformId,
} from "@sai-mp-jira-task-view/jira-providers";

import { getCurrentPlatformToken, refreshJiraAccessToken } from "@/lib/axiosClient";

const platformId = (process.env.NEXT_PUBLIC_TASK_PLATFORM ?? "jira") as TaskPlatformId;

/**
 * PHASE 3.2–3.3 — Single injected {@link import("@sai-mp-jira-task-view/platform").TaskPlatformProvider}.
 * Prefer this over ad-hoc `/api/jira/*` calls in UI code where the normalized contract fits.
 */
export const taskPlatform = createTaskPlatformProvider(platformId, {
  getAccessToken: () => getCurrentPlatformToken()?.accessToken ?? null,
  onUnauthorized: async () => {
    await refreshJiraAccessToken();
  },
});
