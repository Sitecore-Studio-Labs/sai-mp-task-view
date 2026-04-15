/**
 * Platform-neutral domain types used across the application.
 * Both JiraAdapter and WrikeAdapter map their native API responses to these types.
 * The UI layer consumes only these types, never platform-specific ones directly.
 */

export type PlatformType = "jira" | "wrike";

export interface PlatformProject {
  id: string;
  /** Jira: project key (e.g. "PROJ"); Wrike: folderId */
  key: string;
  name: string;
}

export interface PlatformUser {
  /** Jira: accountId; Wrike: contactId */
  id: string;
  displayName: string;
  avatarUrl?: string;
}

export interface PlatformStatus {
  id: string;
  name: string;
  category?: string;
}

export interface PlatformPriority {
  id: string;
  name: string;
  description?: string;
  iconUrl?: string;
}

export interface PlatformIssueType {
  id: string;
  name: string;
  description?: string;
  iconUrl?: string;
}

export interface PlatformTask {
  id: string;
  /** Jira: issue key "PROJ-123"; Wrike: task permalink or ID */
  key: string;
  summary: string;
  /** Plain-text or HTML description for display */
  description?: string;
  /** Raw platform-specific description (e.g. Jira ADF object) for rich rendering */
  rawDescription?: unknown;
  status?: PlatformStatus;
  priority?: PlatformPriority;
  assignee?: PlatformUser;
  reporter?: PlatformUser;
  /** Undefined for Wrike (no issue type concept) */
  issueType?: PlatformIssueType;
  createdDate?: string;
  dueDate?: string;
  parentKey?: string;
  subtasks?: PlatformTask[];
  attachments?: PlatformAttachment[];
  project?: PlatformProject;
  platform: PlatformType;
}

export interface PlatformTaskListResponse {
  tasks: PlatformTask[];
  nextCursor?: string;
  isLast: boolean;
}

export interface PlatformComment {
  id: string;
  /** Normalized to plain text or HTML (Jira ADF is converted) */
  body: string;
  /** Raw body for platform-specific rendering (e.g. Jira ADF object) */
  rawBody?: unknown;
  author?: PlatformUser;
  createdDate?: string;
  updatedDate?: string;
}

export interface PlatformCommentsResponse {
  comments: PlatformComment[];
  total?: number;
}

export interface PlatformTransition {
  id: string;
  name: string;
  targetStatus?: PlatformStatus;
}

export interface PlatformAttachment {
  id: string;
  filename: string;
  contentUrl?: string;
  mimeType?: string;
}

export interface PlatformSite {
  id: string;
  name: string;
  url: string;
}

export interface PlatformTaskFilters {
  assignee?: string[];
  priority?: string[];
  status?: string[];
  /** Free-text search on task summary / title */
  query?: string;
}

export interface PlatformCreateTaskPayload {
  projectId: string;
  summary: string;
  description?: string;
  /** Jira: required issue type ID; Wrike: ignored */
  issueTypeId?: string;
  priority?: string;
  assignee?: string;
  dueDate?: string;
  parentTaskKey?: string;
}

export interface PlatformUpdateTaskPayload {
  summary?: string;
  description?: string;
  /** Jira: issue type ID; Wrike: ignored */
  issueTypeId?: string | null;
  /** Parent task key; use null to clear */
  parentTaskKey?: string | null;
  /** Priority ID or name; use null to clear */
  priority?: string | null;
  /** Assignee ID; use null to unassign */
  assignee?: string | null;
  /** ISO date string (YYYY-MM-DD); use null to clear */
  dueDate?: string | null;
  /** Wrike: customStatusId for direct status change; Jira: use transitions instead */
  statusId?: string | null;
}

export interface PlatformCreateCommentPayload {
  taskId: string;
  text: string;
  replyToAuthorId?: string;
  replyToAuthorName?: string;
}

export interface PlatformWebhookRegistration {
  events: string[];
  filterExpression?: string;
}

export interface PlatformPermission {
  permission: string;
  granted: boolean;
}

export enum PlatformPermissionType {
  DELETE = "DELETE",
  EDIT = "EDIT",
  ASSIGN = "ASSIGN",
  CREATE = "CREATE",
  TRANSITION = "TRANSITION",
}
