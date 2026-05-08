// Raw Jira Cloud API response shapes — NOT @mp/task-core types.
// Source of truth: https://developer.atlassian.com/cloud/jira/platform/rest/v3/
// These are platform-specific types consumed by JiraAdapter.ts and JiraHttpAdapter.ts.
// Do NOT use these types in libs/ — map to @mp/task-core types in JiraServiceAdapter.ts instead.

export interface JiraProject {
  id: string;
  key: string;
  name: string;
}

export interface GetCommentsForIssueResponse {
  startAt: number;
  maxResults: number;
  total: number;
  comments: JiraComment[];
}

export interface JiraProjectStatuses {
  id: string;
  name: string;
  statuses: JiraStatus[];
}

export interface JiraADFTextNode {
  type: "text";
  text: string;
}

export interface JiraADFParagraphNode {
  type: "paragraph";
  content: JiraADFTextNode[];
}

export type JiraADFNode = JiraADFParagraphNode | JiraADFTextNode;

export interface JiraADFDocument {
  type: "doc";
  version: 1;
  content: JiraADFNode[];
}

export interface JiraComment {
  id: string;
  self: string;
  author: JiraUser;
  updateAuthor: JiraUser;
  body: JiraADFDocument;
  created: string;
  updated: string;
  visibility?: {
    identifier: string;
    type: string;
    value: string;
  };
}

export interface JiraIssueType {
  id: string;
  name: string;
  description?: string;
  iconUrl?: string;
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

export interface JiraStatus {
  id: string;
  name: string;
  description: string;
  statusCategory: {
    id: string;
    key: string;
    name: string;
  };
  iconUrl?: string;
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

export interface CreateCommentPayload {
  issueIdOrKey: string;
  text: string;
  replyToCommentId?: string;
  replyToAuthorAccountId?: string;
  replyToAuthorDisplayName?: string;
  visibility?: {
    identifier: string;
    type: "role" | "group";
    value: string;
  };
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
  /** Jira issue key (e.g. "PROJ-123") for the parent issue. If omitted, a standalone issue is created. */
  parentIssueKey?: string;
}

/** Minimal issue info for parent picker / search. */
export interface JiraIssueOption {
  id: string;
  key: string;
  summary: string;
  issueType?: { name: string; iconUrl?: string };
}

export interface JiraIssue {
  id: string;
  key: string;
  fields: {
    summary: string;
    status: JiraStatus;
    project?: { id: string; key: string; name?: string };
    parent?: JiraIssueOption;
    issuetype: {
      id: string;
      name: string;
      iconUrl?: string;
    };
    priority?: JiraPriority;
    assignee?: JiraUser;
    reporter?: JiraUser;
    description?: {
      type: string;
      version: number;
      content: Array<{
        type: string;
        content?: Array<{
          type: string;
          text?: string;
        }>;
      }>;
    };
    duedate?: string;
    subtasks?: Array<JiraIssue>;
    comment?: {
      comments: JiraComment[];
    };
    attachment?: {
      id: string;
      content: string;
      filename: string;
    }[];
  };
}

export type JiraIssueFilters = {
  assignee?: string[];
  priority?: string[];
  status?: string[];
};

/** Paginated response from GET /api/jira/issues (project issues list). */
export interface JiraProjectIssuesResponse {
  issues: JiraIssue[];
  nextPageToken?: string;
  isLast: boolean;
}

/** Payload for updating a Jira issue (only include fields to change). */
export interface UpdateJiraTaskPayload {
  summary?: string;
  description?: string;
  /** Issue type id; required by UI when changing task type. */
  issueType?: string | null;
  /** Parent issue key (e.g. "PROJ-123"); required when setting issue type to sub-task. */
  parentIssueKey?: string | null;
  /** Priority id or name; use null to clear. */
  priority?: string | null;
  /** Assignee accountId; use null to unassign. */
  assignee?: string | null;
  /** ISO date string (YYYY-MM-DD); use null to clear. */
  dueDate?: string | null;
}

export type JiraSite = { id: string; name: string; url: string };

export type ProjectIssueType = {
  id: string;
  name: string;
  fields?: JiraField[];
};

export type JiraField = {
  fieldId?: string;
  key?: string;
  allowedValues?: JiraPriority[];
};

export enum JiraPermission {
  DELETE = "DELETE_ISSUES",
  EDIT = "EDIT_ISSUES",
  ASSIGN = "ASSIGN_ISSUES",
  CREATE = "CREATE_ISSUES",
  TRANSITION = "TRANSITION_ISSUES",
}
