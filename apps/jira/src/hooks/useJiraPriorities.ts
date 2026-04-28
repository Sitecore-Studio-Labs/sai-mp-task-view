import { useQuery } from "@tanstack/react-query";

import { apiClient } from "@/lib/axiosClient";
import type { JiraPriority } from "@/types/jira";

export const JIRA_PRIORITIES_QUERY_KEY = ["jira", "priorities"] as const;

export function useJiraPriorities(projectKey: string | null) {
  return useQuery({
    queryKey: [...JIRA_PRIORITIES_QUERY_KEY, projectKey],
    queryFn: async (): Promise<JiraPriority[]> => {
      const res = await apiClient.get<JiraPriority[]>("/jira/project-priorities", {
        params: { projectKey },
      });
      return res.data;
    },
    enabled: !!projectKey,
  });
}
