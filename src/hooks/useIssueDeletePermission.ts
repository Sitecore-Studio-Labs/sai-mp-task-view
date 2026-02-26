import { apiClient } from '@/lib/axiosClient';
import { useQuery } from '@tanstack/react-query';

export interface DeletePermissionResponse {
  canDelete: boolean;
}

export const useIssueDeletePermission = (issueIdOrKey: string | null) => {
  return useQuery<DeletePermissionResponse>({
    queryKey: ['jira', 'issueDeletePermission', issueIdOrKey],
    enabled: !!issueIdOrKey,

    queryFn: async () => {
      const res = await apiClient.get('/jira/permissions', {
        params: { issueIdOrKey },
      });

      return res.data;
    },
  });
};
