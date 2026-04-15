/**
 * Wrike API v4 response types.
 * Used internally by WrikeAdapter to parse Wrike REST responses.
 * These are NOT used by the UI layer — they are mapped to Platform* types.
 * @see https://developers.wrike.com/api/v4/
 */

export interface WrikeApiResponse<T> {
  kind: string;
  data: T[];
}

export interface WrikeContact {
  id: string;
  firstName: string;
  lastName: string;
  type: "Person" | "Group";
  profiles: WrikeContactProfile[];
  avatarUrl?: string;
  primaryEmail?: string;
}

export interface WrikeContactProfile {
  accountId: string;
  email?: string;
  role: string;
  external: boolean;
  admin: boolean;
  owner: boolean;
}

export interface WrikeFolder {
  id: string;
  accountId: string;
  title: string;
  createdDate?: string;
  updatedDate?: string;
  description?: string;
  childIds?: string[];
  scope: string;
  project?: WrikeProjectDetails;
}

export interface WrikeProjectDetails {
  authorId: string;
  ownerIds: string[];
  status: "Green" | "Yellow" | "Red" | "Completed" | "OnHold" | "Cancelled";
  startDate?: string;
  endDate?: string;
  createdDate?: string;
  completedDate?: string;
}

export interface WrikeTask {
  id: string;
  accountId: string;
  title: string;
  description?: string;
  briefDescription?: string;
  parentIds: string[];
  superParentIds?: string[];
  status: "Active" | "Completed" | "Deferred" | "Cancelled";
  importance: "High" | "Normal" | "Low";
  createdDate: string;
  updatedDate: string;
  dates: WrikeTaskDates;
  scope: string;
  authorIds: string[];
  responsibleIds: string[];
  permalink: string;
  priority?: string;
  followedByMe?: boolean;
  followerIds?: string[];
  superTaskIds?: string[];
  subTaskIds?: string[];
  dependencyIds?: string[];
  customStatusId?: string;
  customFields?: WrikeCustomField[];
}

export interface WrikeTaskDates {
  type: "Backlog" | "Milestone" | "Planned";
  duration?: number;
  start?: string;
  due?: string;
}

export interface WrikeCustomField {
  id: string;
  value: string;
}

export interface WrikeComment {
  id: string;
  authorId: string;
  text: string;
  createdDate: string;
  updatedDate?: string;
  taskId?: string;
  folderId?: string;
}

export interface WrikeAttachment {
  id: string;
  authorId: string;
  name: string;
  createdDate: string;
  version: number;
  type: "Wrike" | "Google" | "DropBox" | "Box" | "OneDrive" | "External" | "DAM";
  contentType?: string;
  size?: number;
  taskId?: string;
  folderId?: string;
  url?: string;
}

export interface WrikeWorkflow {
  id: string;
  name: string;
  standard: boolean;
  hidden: boolean;
  customStatuses: WrikeCustomStatus[];
}

export interface WrikeCustomStatus {
  id: string;
  name: string;
  standardName: boolean;
  color: string;
  standard: boolean;
  group: "Active" | "Completed" | "Deferred" | "Cancelled";
  hidden: boolean;
}

export interface WrikeWebhook {
  id: string;
  accountId: string;
  hookUrl: string;
  status: "Active" | "Suspended";
  events?: string[];
}

export interface WrikeSpace {
  id: string;
  title: string;
  avatarUrl?: string;
  accessType: "Personal" | "Private" | "Public";
  archived: boolean;
}

export interface WrikeCreateTaskRequest {
  title: string;
  description?: string;
  status?: string;
  importance?: "High" | "Normal" | "Low";
  dates?: {
    start?: string;
    due?: string;
    type?: "Backlog" | "Milestone" | "Planned";
  };
  responsibles?: string[];
  followers?: string[];
  parentIds?: string[];
  customStatus?: string;
  customFields?: WrikeCustomField[];
}

export interface WrikeUpdateTaskRequest {
  title?: string;
  description?: string;
  status?: string;
  importance?: "High" | "Normal" | "Low";
  dates?: {
    start?: string;
    due?: string;
    type?: "Backlog" | "Milestone" | "Planned";
  };
  addResponsibles?: string[];
  removeResponsibles?: string[];
  addParents?: string[];
  removeParents?: string[];
  customStatus?: string;
  customFields?: WrikeCustomField[];
}
