/**
 * Platform-agnostic types for the create-task form and provider.
 * Used by CreateTaskView and by platform-specific providers (Jira, Asana, etc.).
 */

export interface IssueTypeOption {
  id: string;
  name: string;
  iconUrl?: string;
}

export interface PriorityOption {
  id: string;
  name: string;
  iconUrl?: string;
}

export interface AssigneeOption {
  id: string;
  displayName: string;
  avatarUrl?: string;
}

export interface ParentIssueOption {
  id: string;
  key: string;
  summary: string;
  issueType?: { name: string; iconUrl?: string };
}

/** Result of creating a task (platform-agnostic). */
export interface CreateTaskResult {
  id: string;
  key: string;
  summary: string;
  projectId: string;
  projectKey: string;
}

/** Payload for create-task API (normalized across platforms). */
export interface CreateTaskPayload {
  projectId: string;
  issueTypeId: string;
  summary: string;
  description?: string;
  priority?: string;
  parentIssueKey?: string;
  assignee?: string;
  dueDate?: string;
}

/** Form field values for the create-task form. */
export interface CreateTaskFormValues {
  issueTypeId: string;
  summary: string;
  description: string;
  priority: string;
  parentIssueKey: string;
  assignee: string;
  dueDate: Date | null;
}
