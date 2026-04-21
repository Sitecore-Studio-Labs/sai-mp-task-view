import { useQuery } from "@tanstack/react-query";

import { jiraExtension } from "@/lib/jira-extension";
import type { JiraUser } from "@/types/jira";

const JIRA_ASSIGNEES_QUERY_KEY = ["jira", "assignees"] as const;

export function useJiraAssignees(projectIdOrKey: string | null, searchQuery?: string) {
  return useQuery({
    queryKey: [...JIRA_ASSIGNEES_QUERY_KEY, projectIdOrKey, searchQuery ?? ""],
    queryFn: async (): Promise<JiraUser[]> => {
      if (!projectIdOrKey) return [];
      return jiraExtension.getAssignees(projectIdOrKey, searchQuery);
    },
    enabled: !!projectIdOrKey,
  });
}
