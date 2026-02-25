import { apiClient } from "@/lib/axiosClient";
import { useQuery } from "@tanstack/react-query";

export function useProjectIssueTypes(projectId?: string) {
  return useQuery({
    queryKey: ["project-issue-types", projectId],
    queryFn: async () => {
      if (!projectId) return [];

      const response = await apiClient.get(
        `/jira/issue-types?projectId=${projectId}`,
      );
      return response.data;
    },
    enabled: !!projectId,
  });
}
