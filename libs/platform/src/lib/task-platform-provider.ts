/**
 * PHASE 2.4 — Platform-agnostic task/project contract (migration-mvp-guide).
 * Maps to normalized shapes for UI and future non-Jira providers.
 */

export type PlatformProject = {
  id: string;
  key: string;
  name: string;
};

/** Issue classification for list UIs (Jira issue type, etc.). */
export type PlatformTaskIssueType = {
  name: string;
  iconUrl?: string;
};

export type PlatformTask = {
  id: string;
  key: string;
  title: string;
  statusName?: string;
  issueType?: PlatformTaskIssueType;
};

/** Optional arguments for {@link TaskPlatformProvider.getTasks} (Jira reference: `query` on BFF). */
export type GetTasksOptions = {
  query?: string;
};

/**
 * Minimal platform-agnostic surface: project/task listing via the app BFF.
 * OAuth and platform-specific APIs live outside this contract (e.g. `JiraExtensionProvider`).
 */
export interface TaskPlatformProvider {
  getProjects(): Promise<PlatformProject[]>;
  getTasks(projectKey: string, options?: GetTasksOptions): Promise<PlatformTask[]>;
}
