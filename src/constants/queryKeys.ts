// Connection & Auth
export const JIRA_STATUS_QUERY_KEY = ['jira', 'connectionStatus'] as const;
export const JIRA_CURRENT_USER_QUERY_KEY = ['jira', 'currentUser'] as const;

// Projects
export const JIRA_PROJECTS_QUERY_KEY = ['jira', 'projects'] as const;
export const PROJECT_STATUSES_QUERY_KEY = (projectKey: string | undefined) =>
  ['jira', 'projectStatuses', projectKey] as const;
export const PROJECT_ISSUE_TYPES_QUERY_KEY = (projectId: string | undefined) =>
  ['jira', 'projectIssueTypes', projectId] as const;

// Issues & Details
export const JIRA_BOARD_ISSUES_QUERY_KEY = (
  projectKey: string | null,
  filters: {
    status: string[];
    priority: string[];
    assignee: string[];
  },
) =>
  [
    'jira',
    'boardIssues',
    projectKey ?? 'none',
    filters.status.join(','),
    filters.priority.join(','),
    filters.assignee.join(','),
  ] as const;

export const JIRA_BOARD_ISSUES_INVALIDATE_KEY = [
  'jira',
  'boardIssues',
] as const;

export const JIRA_ISSUE_QUERY_KEY = (issueKey: string) =>
  ['jira', 'issue', issueKey] as const;

// Comments
export const JIRA_ISSUE_COMMENTS_QUERY_KEY = (issueIdOrKey: string | null) =>
  ['jira', 'issueComments', issueIdOrKey] as const;

export const JIRA_COMMENT_DETAILS_QUERY_KEY = (
  issueIdOrKey: string,
  commentId: string,
) => ['jira', 'commentDetails', issueIdOrKey, commentId] as const;

// Permissions
export const JIRA_ISSUE_DELETE_PERMISSION_QUERY_KEY = (
  issueIdOrKey: string | null,
) => ['jira', 'issueDeletePermission', issueIdOrKey] as const;
