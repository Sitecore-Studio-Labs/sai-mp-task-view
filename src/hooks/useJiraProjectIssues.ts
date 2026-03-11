import { useQuery } from "@tanstack/react-query";
import type {
  JiraIssue,
  JiraIssueOption,
  JiraProjectIssuesResponse,
} from "@/types/jira";
import { apiClient } from "@/lib/axiosClient";

const JIRA_PROJECT_ISSUES_QUERY_KEY = ["jira", "projectIssues"] as const;

function mapIssueToOption(issue: JiraIssue): JiraIssueOption {
  return {
    id: issue.id,
    key: issue.key,
    summary: issue.fields.summary,
    issueType: issue.fields.issuetype
      ? {
          name: issue.fields.issuetype.name,
          iconUrl: issue.fields.issuetype.iconUrl,
        }
      : undefined,
  };
}

/**
 * Fetches issues in a project for the parent-issue dropdown (create/edit task).
 *
 * Refactor rationale:
 * - Uses projectKey (not projectId) because GET /api/jira/issues expects projectKey;
 *   the backend builds JQL with "project = KEY", so the param must match.
 * - Response is paginated (issues + nextPageToken + isLast); we map issues to
 *   JiraIssueOption[] so callers get a stable shape for dropdown options.
 * - Query is disabled when projectKey is missing so we don't hit the API with
 *   an invalid request.
 */
export function useJiraProjectIssues(
  projectKey: string | null,
  searchQuery?: string,
) {
  return useQuery({
    queryKey: [...JIRA_PROJECT_ISSUES_QUERY_KEY, projectKey, searchQuery ?? ""],
    queryFn: async (): Promise<JiraIssueOption[]> => {
      if (!projectKey?.trim()) return [];
      const res = await apiClient.get<JiraProjectIssuesResponse>("/jira/issues", {
        params: {
          projectKey: projectKey.trim(),
          query: searchQuery || undefined,
        },
      });
      const issues = res.data?.issues ?? [];
      return issues.map(mapIssueToOption);
    },
    enabled: !!projectKey?.trim(),
  });
}
