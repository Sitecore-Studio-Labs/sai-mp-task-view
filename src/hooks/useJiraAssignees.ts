import { useQuery } from "@tanstack/react-query";

import { apiClient } from "@/lib/axiosClient";
import type { JiraUser } from "@/types/jira";

const JIRA_ASSIGNEES_QUERY_KEY = ["jira", "assignees"] as const;

export function useJiraAssignees(projectIdOrKey: string | null, searchQuery?: string) {
  return useQuery({
    queryKey: [...JIRA_ASSIGNEES_QUERY_KEY, projectIdOrKey, searchQuery ?? ""],
    queryFn: async (): Promise<JiraUser[]> => {
      if (!projectIdOrKey) return [];
      const res = await apiClient.get<JiraUser[]>("/jira/assignees", {
        params: { projectId: projectIdOrKey, query: searchQuery || undefined },
      });
      return res.data;
    },
    enabled: !!projectIdOrKey,
  });
}
