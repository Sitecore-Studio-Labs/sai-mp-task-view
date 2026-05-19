export interface PlatformSetupRecord {
  id: string;
  userId: string;
  connectionId: string;
  siteId: string;
  siteUrl: string;
  siteName: string | null;
  defaultProjectId: string;
  defaultProjectKey: string;
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
  siteId: string;
  siteUrl: string;
  siteName?: string;
  defaultProjectId: string;
  defaultProjectKey: string;
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
