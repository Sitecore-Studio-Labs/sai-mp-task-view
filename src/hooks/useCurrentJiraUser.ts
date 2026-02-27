import { useQuery } from '@tanstack/react-query';
import { apiClient } from '@/lib/axiosClient';
import { JIRA_CURRENT_USER_QUERY_KEY } from '@/constants/queryKeys';

export interface JiraUser {
  accountId: string;
  displayName: string;
  avatarUrls?: Record<string, string>;
}

export const useCurrentJiraUser = () => {
  return useQuery<JiraUser>({
    queryKey: JIRA_CURRENT_USER_QUERY_KEY,
    queryFn: async () => {
      const res = await apiClient.get('/jira/me');
      return res.data;
    },
  });
};
