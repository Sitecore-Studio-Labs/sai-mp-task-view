import type { PlatformScopeSelection } from "./setup-scope";

export interface PlatformSetupRecord {
  id: string;
  userId: string;
  connectionId: string;
  /** Generalized scope selections keyed by level id (e.g. site, project, board). */
  scopeSelections?: Record<string, PlatformScopeSelection>;
  /** Leaf level id whose key gates the task list. */
  taskListScopeLevelId?: string;
  /** @deprecated Prefer scopeSelections.site — kept for Jira dual-read during migration. */
  siteId: string;
  /** @deprecated Prefer scopeSelections.site.meta.url */
  siteUrl: string;
  /** @deprecated Prefer scopeSelections.site.name */
  siteName: string | null;
  /** @deprecated Prefer scopeSelections.project.id */
  defaultProjectId: string;
  /** @deprecated Prefer getTaskListScopeKey(setup) */
  defaultProjectKey: string;
  /** @deprecated Prefer scopeSelections.project.name */
  defaultProjectName: string | null;
  setupCompletedAt: string | null;
  createdAt: string;
  updatedAt: string;
}

export interface PlatformSetupMapping {
  id: string;
  userId: string;
  connectionId: string;
  externalResourceId: string;
  externalResourceName: string | null;
  siteId: string | null;
  siteUrl: string | null;
  siteName: string | null;
  projectId: string;
  projectKey: string;
  projectName: string | null;
  createdAt: string;
  updatedAt: string;
}

export interface PlatformSetupResponse {
  connected: boolean;
  setup: PlatformSetupRecord | null;
  mappings: PlatformSetupMapping[];
}

export interface UpsertPlatformSetupPayload {
  scopeSelections: Record<string, PlatformScopeSelection>;
  taskListScopeLevelId: string;
  /** Legacy Jira fields — optional when scopeSelections is provided; server dual-writes. */
  siteId?: string;
  siteUrl?: string;
  siteName?: string;
  defaultProjectId?: string;
  defaultProjectKey?: string;
  defaultProjectName?: string;
}

export interface UpsertPlatformSetupMappingItem {
  externalResourceId: string;
  externalResourceName?: string;
  siteId?: string;
  siteUrl?: string;
  siteName?: string;
  projectId: string;
  projectKey: string;
  projectName?: string;
}

export interface UpsertPlatformSetupMappingsPayload {
  mappings: UpsertPlatformSetupMappingItem[];
}

export interface PlatformExternalResource {
  id: string;
  name: string;
  displayName?: string;
}
