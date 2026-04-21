import { useQuery } from "@tanstack/react-query";

import { jiraExtension } from "@/lib/jira-extension";
import type { JiraPriority } from "@/types/jira";

export const JIRA_PRIORITIES_QUERY_KEY = ["jira", "priorities"] as const;

export function useJiraPriorities(projectKey: string | null) {
  return useQuery({
    queryKey: [...JIRA_PRIORITIES_QUERY_KEY, projectKey],
    queryFn: async (): Promise<JiraPriority[]> => {
      if (!projectKey) return [];
      return jiraExtension.getProjectPriorities(projectKey);
    },
    enabled: !!projectKey,
  });
}
