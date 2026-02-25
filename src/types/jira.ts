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

export interface CreateCommentPayload {
  issueIdOrKey: string;
  text: string;
  replyToCommentId?: string;
  replyToAuthorAccountId?: string;
  replyToAuthorDisplayName: string;
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
      statusCategory: {
        id: string;
        key: string;
        name: string;
      };
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
    parent?: JiraIssue;
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
