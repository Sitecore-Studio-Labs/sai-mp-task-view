import { useQuery, useQueryClient } from '@tanstack/react-query';
import { apiClient } from '@/lib/axiosClient';
import {
  JIRA_STATUS_QUERY_KEY,
  JIRA_PROJECTS_QUERY_KEY,
} from '@/constants/queryKeys';

export function useJiraConnectionStatus() {
  return useQuery({
    queryKey: JIRA_STATUS_QUERY_KEY,
    queryFn: async (): Promise<{ connected: boolean }> => {
      const res = await apiClient.get<{ connected: boolean }>(
        '/auth/jira/status',
      );
      return res.data;
    },
  });
}

export function useDisconnectJira() {
  const queryClient = useQueryClient();

  return async () => {
    await apiClient.post('/auth/jira/disconnect');
    queryClient.invalidateQueries({ queryKey: JIRA_STATUS_QUERY_KEY });
    queryClient.invalidateQueries({ queryKey: JIRA_PROJECTS_QUERY_KEY });
  };
}
