import { useQuery } from "@tanstack/react-query";
import { apiClient } from "@/lib/axiosClient";

export const useBoardIssues = (projectKey: string | null) => {
  return useQuery({
    queryKey: ["jira", "boardIssues", projectKey],
    queryFn: async () => {
      const res = await apiClient.get(`/jira/projects/${projectKey}/issues`);
      return res.data;
    },
    enabled: !!projectKey,
  });
};
