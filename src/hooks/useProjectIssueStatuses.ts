import { apiClient } from '@/lib/axiosClient';
import { JiraProjectStatuses } from '@/types/jira';
import { useQuery } from '@tanstack/react-query';

export function useProjectIssueStatuses(projectKey?: string) {
  return useQuery({
    queryKey: ['project-statuses', projectKey],
    queryFn: async (): Promise<JiraProjectStatuses[]> => {
      if (!projectKey) return [];

      const response = await apiClient.get<JiraProjectStatuses[]>(
        `/jira/statuses/${projectKey}`,
      );

      return response.data;
    },
    enabled: !!projectKey,
  });
}
