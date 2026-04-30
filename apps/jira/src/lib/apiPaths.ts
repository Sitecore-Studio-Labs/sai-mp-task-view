import type { PlatformApiPaths } from "@mp/task-core";

/**
 * Jira-specific API path definitions.
 * These map to the Next.js API routes under apps/jira/src/app/api/.
 */
export const JIRA_API_PATHS: PlatformApiPaths = {
  // Auth
  connectionStatus: "/auth/jira/status",
  disconnect: "/auth/jira/disconnect",

  // Sites
  sites: "/jira/sites",
  selectSite: "/jira/select-site",

  // Projects
  projects: "/jira/projects",
  selectProject: "/jira/select-project",

  // Issues
  issues: "/jira/issues",
  issue: (key: string) => `/jira/issues/${key}`,
  issueTransitions: (key: string) => `/jira/issues/${key}/transitions`,
  transitionIssue: (key: string) => `/jira/issues/${key}/transitions`,

  // Issue metadata
  issueTypes: "/jira/issue-types",
  projectPriorities: "/jira/project-priorities",

  // People
  assignees: "/jira/assignees",
  currentUser: "/jira/current-user",

  // Statuses
  projectStatuses: (projectKey: string) => `/jira/statuses/${projectKey}`,

  // Comments
  comments: "/jira/comments",
  updateComment: (id: string) => `/jira/comments/${id}`,
  deleteComment: (id: string) => `/jira/comments/${id}`,

  // Permissions
  permissions: "/jira/permissions",

  // Attachments
  attachment: (id: string) => `/jira/attachment/${id}`,
  uploadAttachments: (issueKey: string) =>
    `/jira/attachment/upload?issueIdOrKey=${encodeURIComponent(issueKey)}`,

  // Webhooks / sync
  syncSignal: "/jira/sync-signal",

  // AI work breakdown
  workbreakdown: "/workbreakdown",
  workbreakdownDraft: (draftId: string) => `/workbreakdown/${draftId}`,
  workbreakdownPublish: (draftId: string) => `/workbreakdown/${draftId}/publish`,
  parseRequirements: "/ai/parse-requirements",
};
