import { useQuery } from "@tanstack/react-query";

import { apiClient } from "@/lib/axiosClient";
import type { JiraPriority } from "@/types/jira";

export const JIRA_PRIORITIES_QUERY_KEY = ["jira", "priorities"] as const;

export function useJiraPriorities() {
  return useQuery({
    queryKey: JIRA_PRIORITIES_QUERY_KEY,
    queryFn: async (): Promise<JiraPriority[]> => {
      const res = await apiClient.get<JiraPriority[]>("/jira/priorities");
      return res.data;
    },
  });
}
