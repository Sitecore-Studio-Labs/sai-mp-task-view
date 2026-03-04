import { useQuery } from '@tanstack/react-query';
import { apiClient } from '@/lib/axiosClient';

export interface JiraUser {
  accountId: string;
  displayName: string;
  avatarUrls?: Record<string, string>;
}

export const useCurrentJiraUser = () => {
  return useQuery<JiraUser>({
    queryKey: ['jira', 'currentUser'],
    queryFn: async () => {
      const res = await apiClient.get('/jira/me');
      return res.data;
    },
  });
};
