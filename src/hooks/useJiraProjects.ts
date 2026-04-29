import { useQuery } from "@tanstack/react-query";

import { apiClient } from "@/lib/axiosClient";
import type { JiraProject } from "@/types/jira";

import { JIRA_PROJECTS_QUERY_KEY } from "./useJiraConnectionStatus";

/**
 * Example TanStack Query hook for loading Jira projects via the Next.js API route.
 * This demonstrates how axios interceptors and React Query work together.
 */
export const useJiraProjects = (cloudId?: string) => {
  return useQuery({
    queryKey: [...JIRA_PROJECTS_QUERY_KEY, cloudId === undefined ? "selected-site" : cloudId],
    enabled: cloudId === undefined ? true : Boolean(cloudId),
    queryFn: async (): Promise<JiraProject[]> => {
      const response = await apiClient.get<JiraProject[]>("/jira/projects", {
        params: cloudId ? { cloudId } : undefined,
      });
      return response.data;
    },
  });
};
