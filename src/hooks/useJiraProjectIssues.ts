import { useQuery } from "@tanstack/react-query";
import type { JiraIssueOption } from "@/types/jira";
import { apiClient } from "@/lib/axiosClient";

const JIRA_PROJECT_ISSUES_QUERY_KEY = ["jira", "projectIssues"] as const;

export function useJiraProjectIssues(
  projectIdOrKey: string | null,
  searchQuery?: string,
) {
  return useQuery({
    queryKey: [...JIRA_PROJECT_ISSUES_QUERY_KEY, projectIdOrKey, searchQuery ?? ""],
    queryFn: async (): Promise<JiraIssueOption[]> => {
      if (!projectIdOrKey) return [];
      const res = await apiClient.get<JiraIssueOption[]>("/jira/issues", {
        params: { projectId: projectIdOrKey, query: searchQuery || undefined },
      });
      return res.data;
    },
    enabled: !!projectIdOrKey,
  });
}
