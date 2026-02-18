export interface JiraProject {
  id: string;
  key: string;
  name: string;
}

export interface JiraIssue {
  id: string;
  key: string;
  fields: {
    summary: string;
    status: {
      id: string;
      name: string;
      description: string;
    };
    issuetype: {
      id: string;
      name: string;
      iconUrl: string;
    };
    priority?: {
      id: string;
      name: string;
      iconUrl: string;
    };
    assignee?: {
      accountId: string;
      displayName: string;
      emailAddress: string;
      avatarUrls: {
        "16x16": string;
        "24x24": string;
        "32x32": string;
        "48x48": string;
      };
    };
  };
}

/** Payload for updating a Jira issue (only include fields to change). */
export interface UpdateJiraTaskPayload {
  summary?: string;
  description?: string;
  /** Priority id or name; use null to clear. */
  priority?: string | null;
  /** Assignee accountId; use null to unassign. */
  assignee?: string | null;
  /** ISO date string (YYYY-MM-DD); use null to clear. */
  dueDate?: string | null;
}
