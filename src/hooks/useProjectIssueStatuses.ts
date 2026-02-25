import { apiClient } from "@/lib/axiosClient";
import { useQuery } from "@tanstack/react-query";

export function useProjectIssueStatuses(projectKey?: string) {
  return useQuery({
    queryKey: ["project-statuses", projectKey],
    queryFn: async () => {
      if (!projectKey) return [];

      const response = await apiClient.get(`/jira/statuses/${projectKey}`);

      return response.data;
    },
    enabled: !!projectKey,
  });
}
