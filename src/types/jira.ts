export interface JiraProject {
  id: string;
  key: string;
  name: string;
}

export interface JiraADFTextNode {
  type: "text";
  text: string;
}

export interface JiraADFParagraphNode {
  type: "paragraph";
  content: JiraADFTextNode[];
}

export type JiraADFNode =
  | JiraADFParagraphNode
  | JiraADFTextNode;

export interface JiraADFDocument {
  type: "doc";
  version: 1;
  content: JiraADFNode[];
}

interface JiraComment {
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
    assignee?: {
      accountId: string;
      displayName: string;
      emailAddress: string;
      avatarUrls: {
        '16x16': string;
        '24x24': string;
        '32x32': string;
        '48x48': string;
      };
    };
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
    "sub-tasks"?: Array<{
      id: string;
      outwardIssue: {
        id: string;
        key: string;
        self: string;
        fields: {
          status: {
            iconUrl: string;
            name: string;
          };
        };
      };
      type: {
        id: string;
        inward: string;
        name: string;
        outward: string;
      };
    }>;
    comment?: JiraComment[];
  };
}