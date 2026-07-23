// Generated from capabilities/wrike.api.yaml — extend as needed.
// Re-generate: npx nx g @mp/generators:platform-app --name=wrike --yamlFile=capabilities/wrike.yaml --force

// Raw API response shapes — NOT @mp/task-core types.

export interface WrikeWorkflow {
  id: string;
  name: string;
  standard?: boolean;
  hidden?: boolean;
  customStatuses?: WrikeCustomStatus[];
}

export interface WrikeTask {
  id: string;
  title?: string;
  /** Built-in Wrike status when custom workflow status metadata is unavailable. */
  status?: WrikeTaskStatus;
  customStatusId?: string;
  importance?: "High" | "Normal" | "Low";
  responsibleIds?: string[];
  authorIds?: string[];
  description?: string;
  briefDescription?: string;
  dates?: { due?: string; start?: string; duration?: number; type?: string };
  subTaskIds?: string[];
  superTaskIds?: string[];
  parentIds?: string[];
  hasAttachments?: boolean;
  attachmentCount?: number;
}

export interface WrikeTasksPageResponse {
  tasks: WrikeTask[];
  nextPageToken?: string;
}

/** Request body for POST /folders/{folderId}/tasks */
export type WrikeApiCreateTaskBody = {
  title: string;
  description?: string;
  importance?: "High" | "Normal" | "Low";
  customStatus?: string;
  dates?: { type: string; due?: string; start?: string };
  responsibles?: string[];
  superTasks?: string[];
};

/** Request body for PUT /tasks/{taskId} */
export type WrikeApiUpdateTaskBody = {
  title?: string;
  description?: string;
  importance?: "High" | "Normal" | "Low";
  customStatus?: string;
  dates?: { type: string; due?: string; start?: string };
  addResponsibles?: string[];
  removeResponsibles?: string[];
  superTasks?: string[];
};

export interface WrikeComment {
  id: string;
  authorId?: string;
  text?: string;
  createdDate?: string;
  updatedDate?: string;
}

export type WrikeCreateCommentPayload = {
  taskId: string;
  text: string;
  plainText?: boolean;
};

export type WrikeTaskStatus = "Active" | "Completed" | "Deferred" | "Cancelled";

export type WrikeTreeScope = "WsTask" | "RbRoot" | "RbFolder" | "WsFolder" | "WsRoot" | "RbTask";

export interface WrikeFolder {
  id: string;
  title?: string;
  /** Present on project folders (object in API; tests may use boolean). */
  project?: boolean | Record<string, unknown>;
  /** Parent folder chain (tasks only — not returned on GET /folders). */
  parentIds?: string[];
  superParentIds?: string[];
  /** True when this folder is a Wrike space (used to load space-scoped workflows). */
  space?: boolean;
  /** Direct child folder IDs (folder tree mode). */
  childIds?: string[];
  scope?: WrikeTreeScope;
}

export interface WrikeSpace {
  id: string;
  title?: string;
}

export interface WrikeAttachment {
  id: string;
  name?: string;
  url?: string;
  contentType?: string;
}

export type WrikeTaskFilters = Record<string, never>;

/** Webhook resource returned by Wrike GET/POST /webhooks APIs. */
export interface WrikeWebhook {
  id: string;
  accountId?: string;
  folderId?: string;
  hookUrl: string;
  status?: "Active" | "Suspended";
}

export type WrikeWebhookRegistrationOptions = {
  events?: string[];
  recursive?: boolean;
  secret?: string;
};

// --- @generated resolution types (generate-mappings) ---

export interface WrikeContact {
  id: string;
  firstName?: string;
  lastName?: string;
  avatarUrl?: string;
  type?: string;
  deleted?: boolean;
}

export interface WrikeCustomStatus {
  id: string;
  name: string;
  standardName: "Active" | "Completed" | "Deferred" | "Cancelled";
  color?: string;
  group?: string;
  hidden?: boolean;
}

// --- end @generated resolution types ---
