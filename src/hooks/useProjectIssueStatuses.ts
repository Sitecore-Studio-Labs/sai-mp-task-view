import { apiClient } from '@/lib/axiosClient';
import { JiraProjectStatuses } from '@/types/jira';
import { useQuery } from '@tanstack/react-query';
import { PROJECT_STATUSES_QUERY_KEY } from '@/constants/queryKeys';

export function useProjectIssueStatuses(projectKey?: string) {
  return useQuery({
    queryKey: PROJECT_STATUSES_QUERY_KEY(projectKey),
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
