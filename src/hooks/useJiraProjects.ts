import { useQuery } from '@tanstack/react-query';
import type { JiraProject } from '@/types/jira';
import { apiClient } from '@/lib/axiosClient';
import { JIRA_PROJECTS_QUERY_KEY } from './useJiraConnectionStatus';

/**
 * Example TanStack Query hook for loading Jira projects via the Next.js API route.
 * This demonstrates how axios interceptors and React Query work together.
 */
export const useJiraProjects = () => {
  return useQuery({
    queryKey: JIRA_PROJECTS_QUERY_KEY,
    queryFn: async (): Promise<JiraProject[]> => {
      const response = await apiClient.get<JiraProject[]>('/jira/projects');
      return response.data;
    },
  });
};
