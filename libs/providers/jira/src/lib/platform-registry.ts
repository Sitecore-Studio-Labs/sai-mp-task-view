import type { TaskPlatformProvider } from "@sai-mp-jira-task-view/platform";

import type { JiraBffTransportOptions } from "./jira-bff-client";
import { JiraTaskPlatformProvider } from "./jira-task-platform-provider";

/**
 * PHASE 3.1 — Registry of platform provider constructors (migration-mvp-guide).
 * Add new platforms here without modifying existing provider classes.
 */
export const PLATFORM_CONFIG = {
  jira: JiraTaskPlatformProvider,
} as const;

export type TaskPlatformId = keyof typeof PLATFORM_CONFIG;

/**
 * PHASE 3.2 — Factory for a {@link TaskPlatformProvider} instance.
 */
export function createTaskPlatformProvider(
  id: TaskPlatformId,
  options?: JiraBffTransportOptions,
): TaskPlatformProvider {
  const C = PLATFORM_CONFIG[id];
  return new C(options);
}

/** Jira-only BFF operations; keep separate from {@link TaskPlatformProvider}. */
export {
  createJiraExtensionProvider,
  type JiraExtensionProvider,
  type JiraIssuePermissionResponse,
  type JiraProjectIssuesListParams,
  type JiraSitesSnapshot,
  type JiraTransitionIssueResult,
} from "./jira-extension-provider";
