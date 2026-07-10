import type { PlatformToken } from "@mp/shared";

import type { PlatformPriority, PlatformStatus, PlatformUser } from "./display-types";

export type { PlatformToken };

// ── Structural entity types ────────────────────────────────────────────────

/** Folder tree node kind (Wrike spaces, folders, and projects). */
export type PlatformProjectKind = "space" | "folder" | "project";

export interface PlatformProject {
  id: string;
  key: string;
  name: string;
  /** Present when the platform exposes a navigable folder tree (e.g. Wrike). */
  kind?: PlatformProjectKind;
  /** Indent depth in hierarchical dropdowns (0 = top level). */
  depth?: number;
  parentId?: string;
}

export interface PlatformSite {
  id: string;
  name: string;
  url: string;
}

export interface PlatformAttachment {
  id: string;
  filename: string;
  content?: string;
  mimeType?: string;
}

export interface PlatformComment {
  id: string;
  author: PlatformUser;
  body: unknown;
  created: string;
  updated: string;
  /** When set, this comment is a reply to the comment with this id. */
  parentCommentId?: string;
}

export interface PlatformTransition {
  id: string;
  name: string;
  to: PlatformStatus;
}

export interface PlatformProjectStatuses {
  id: string;
  name: string;
  statuses: PlatformStatus[];
}

export interface PlatformTask {
  id: string;
  key: string;
  fields: {
    summary: string;
    status: PlatformStatus;
    project?: { id: string; key: string; name?: string };
    parent?: {
      id: string;
      key: string;
      summary: string;
      issueType?: { name: string; iconUrl?: string };
    };
    issuetype: { id: string; name: string; iconUrl?: string };
    priority?: PlatformPriority;
    assignee?: PlatformUser;
    reporter?: PlatformUser;
    description?: unknown;
    duedate?: string;
    subtasks?: PlatformTask[];
    comment?: { comments: PlatformComment[] };
    attachment?: PlatformAttachment[];
  };
}

// ── Filter and view types ──────────────────────────────────────────────────

export interface TaskFilters {
  assignee: string[];
  priority: string[];
  status: string[];
}

export type TaskManagerView = "main" | "create" | "preview";

// ── API response types ─────────────────────────────────────────────────────

export interface PlatformSitesResponse {
  resources: PlatformSite[];
  selectedSite: string | null;
  selectedProject: string | null;
}

export interface PlatformTasksPageResponse {
  issues: PlatformTask[];
  nextPageToken?: string;
  isLast: boolean;
}

export interface PlatformCommentsResponse {
  startAt: number;
  maxResults: number;
  total: number;
  comments: PlatformComment[];
}

export interface PlatformPermissionResponse {
  hasPermission: boolean;
}

export interface AddCommentPayload {
  issueIdOrKey: string;
  text: string;
  replyToCommentId?: string;
  replyToAuthorId?: string;
  replyToAuthorDisplayName?: string;
}
