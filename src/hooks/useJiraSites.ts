import { useQuery } from "@tanstack/react-query";

import { apiClient } from "@/lib/axiosClient";
import { JiraSite } from "@/types/jira";

import { JIRA_SITES_QUERY_KEY } from "./useJiraConnectionStatus";

export function useJiraSites() {
  return useQuery({
    queryKey: JIRA_SITES_QUERY_KEY,
    queryFn: async (): Promise<{
      resources: JiraSite[];
    }> => {
      const response = await apiClient.get<{
        resources: JiraSite[];
      }>("/jira/sites");
      return response.data;
    },
  });
}
