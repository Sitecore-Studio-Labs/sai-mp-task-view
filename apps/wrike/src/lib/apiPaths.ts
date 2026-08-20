import type { PlatformApiPaths } from "@mp/task-core";

/**
 * API path definitions for Wrike.
 * Each path maps to a Next.js API route under src/app/api/.
 *
 * Paths here intentionally omit the "/api" prefix. The axios client created by
 * createPlatformApiClient() (libs/shared) defaults to baseURL="/api", so a path
 * like "/wrike/issues" resolves to "/api/wrike/issues" at runtime.
 * Do NOT add "/api" here — that would double the prefix and produce 404s.
 *
 * TODO: Update these paths to match your actual API route structure.
 */
export const WRIKE_API_PATHS: PlatformApiPaths = {
  connectionStatus: "/auth/wrike/status",
  disconnect: "/auth/wrike/disconnect",

  projects: "/wrike/projects",
  selectProject: "/wrike/select-project",

  // Setup scope listSources "folders" and "boards" alias this projects route.
  setup: "/setup",
  setupMappings: "/setup/mappings",
  setupComplete: "/setup/complete",

  issues: "/wrike/issues",
  issue: (key: string) => `/wrike/issues/${key}`,

  issueTransitions: (key: string) => `/wrike/issues/${key}/transitions`,
  transitionIssue: (key: string) => `/wrike/issues/${key}/transitions`,

  projectPriorities: "/wrike/project-priorities",

  assignees: "/wrike/assignees",
  currentUser: "/wrike/current-user",

  projectStatuses: (projectKey: string) => `/wrike/statuses/${projectKey}`,

  comments: "/wrike/comments",

  permissions: "/wrike/permissions",

  attachment: (id: string) => `/wrike/attachment/${id}`,
  uploadAttachments: (issueKey: string) => `/wrike/issues/${issueKey}/attachments`,

  syncSignal: "/wrike/sync-signal",
};
