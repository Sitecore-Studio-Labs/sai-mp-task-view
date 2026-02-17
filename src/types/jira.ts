export interface JiraProject {
  id: string;
  key: string;
  name: string;
}

export interface JiraIssueType {
  id: string;
  name: string;
  description?: string;
}

export interface JiraPriority {
  id: string;
  name: string;
  description?: string;
  iconUrl?: string;
}

export interface JiraUser {
  accountId: string;
  displayName: string;
  avatarUrls?: Record<string, string>;
}

export interface JiraTask {
  id: string;
  key: string;
  self: string;
  summary: string;
  description?: string;
  projectId: string;
  projectKey: string;
  issueTypeId: string;
  issueTypeName: string;
  priorityId?: string;
  priorityName?: string;
  assigneeAccountId?: string;
  assigneeDisplayName?: string;
  dueDate?: string;
}

/** Payload for creating a Jira issue via the API. */
export interface CreateJiraTaskPayload {
  projectId: string;
  issueTypeId: string;
  summary: string;
  description?: string;
  /** Jira priority name (e.g. "High") or priority id. */
  priority?: string;
  /** Jira Cloud accountId for the assignee. */
  assignee?: string;
  /** ISO date/datetime string; will be converted to Jira's YYYY-MM-DD duedate. */
  dueDate?: string;
}
