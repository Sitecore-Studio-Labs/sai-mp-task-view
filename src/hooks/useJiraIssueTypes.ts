import { apiClient } from '@/lib/axiosClient';
import { useQuery } from '@tanstack/react-query';
import { PROJECT_ISSUE_TYPES_QUERY_KEY } from '@/constants/queryKeys';

export function useProjectIssueTypes(projectId?: string) {
  return useQuery({
    queryKey: PROJECT_ISSUE_TYPES_QUERY_KEY(projectId),
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
