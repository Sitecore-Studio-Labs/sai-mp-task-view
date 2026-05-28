import type { AxiosInstance } from "axios";

/**
 * All API endpoint paths for a platform adapter.
 * Optional fields correspond to capability-gated features — only provide
 * paths for capabilities declared true in the platform's capability matrix.
 */
export interface PlatformApiPaths {
  // Auth
  connectionStatus: string;
  disconnect: string;

  // Sites (optional — not all platforms have multi-tenant sites)
  sites?: string;
  selectSite?: string;

  // Projects
  projects: string;
  selectProject: string;

  // Setup (optional — platforms that require a default project / external mapping flow)
  setup?: string;
  setupMappings?: string;
  setupComplete?: string;

  // Issues / tasks
  issues: string;
  issue: (key: string) => string;
  issueTransitions?: (key: string) => string;
  transitionIssue?: (key: string) => string;

  // Issue metadata
  issueTypes?: string;
  projectPriorities?: string;

  // People
  assignees?: string;
  currentUser?: string;

  // Statuses
  projectStatuses?: (projectKey: string) => string;

  // Comments
  comments?: string;
  updateComment?: (id: string) => string;
  deleteComment?: (id: string) => string;

  // Permissions
  permissions?: string;

  // Attachments
  attachment?: (id: string) => string;
  uploadAttachments?: (issueKey: string) => string;

  // Webhooks / sync
  syncSignal?: string;

  // AI work breakdown
  workbreakdown?: string;
  workbreakdownDraft?: (draftId: string) => string;
  workbreakdownPublish?: (draftId: string) => string;
  parseRequirements?: string;
}

export interface PlatformApiContextValue {
  paths: PlatformApiPaths;
  client: AxiosInstance;
  /**
   * Sets the platform site/tenant id (e.g. Jira cloud ID) sent on every request.
   * Owned by the API client so consumers never mutate the axios instance directly.
   */
  setSiteId?: (siteId: string | null) => void;
}
