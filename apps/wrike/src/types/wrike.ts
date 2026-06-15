// Generated from capabilities/wrike.api.yaml — extend as needed.
// Re-generate: npx nx g @mp/generators:platform-app --name=wrike --yamlFile=capabilities/wrike.yaml --force

// Raw API response shapes — NOT @mp/task-core types.

export interface WrikeTask {
  id: string;
  title?: string;
  customStatusId?: string;
  importance?: "High" | "Normal" | "Low";
  responsibleIds?: string[];
  authorIds?: string[];
  description?: string;
  dates?: { due?: string; start?: string; duration?: number; type?: string };
  subTaskIds?: string[];
  superTaskIds?: string[];
  hasAttachments?: boolean;
}

export interface WrikeTasksPageResponse {
  tasks: WrikeTask[];
  nextPageToken?: string;
}

export type WrikeCreateTaskPayload = {
  summary?: string;
  description?: string | null;
  priority?: string | null;
  statusId?: string | null;
  dueDate?: string | null;
  startDate?: string | null;
  assigneeId?: string | null;
  parentTaskId?: string | null;
};

export type WrikeUpdateTaskPayload = {
  summary?: string | null;
  description?: string | null;
  priority?: string | null;
  statusId?: string | null;
  dueDate?: string | null;
  startDate?: string | null;
  addAssigneeId?: string | null;
  removeAssigneeId?: string | null;
};

export interface WrikeComment {
  id: string;
  authorId?: string;
  text?: string;
  createdDate?: string;
  updatedDate?: string;
}

export type WrikeCreateCommentPayload = {
  taskId?: string;
  text?: string;
  parentId?: string | null;
};

export interface WrikeFolder {
  id: string;
  title?: string;
}

export type WrikeTaskFilters = Record<string, never>;
