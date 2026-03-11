import { apiClient } from "@/lib/axiosClient";
import { useQuery } from "@tanstack/react-query";
import { JIRA_SITES_QUERY_KEY } from "./useJiraConnectionStatus";
import { JiraSite } from "@/types/jira";

export function useJiraSites() {
  return useQuery({
    queryKey: JIRA_SITES_QUERY_KEY,
    queryFn: async (): Promise<{
      resources: JiraSite[];
      selectedSite: string;
    }> => {
      const response = await apiClient.get<{
        resources: JiraSite[];
        selectedSite: string;
      }>("/jira/sites");
      return response.data;
    },
  });
}
