import { apiClient } from '@/lib/axiosClient';
import { useQuery } from '@tanstack/react-query';
import { JIRA_ISSUE_DELETE_PERMISSION_QUERY_KEY } from '@/constants/queryKeys';

export interface DeletePermissionResponse {
  canDelete: boolean;
}

export const useIssueDeletePermission = (issueIdOrKey: string | null) => {
  return useQuery<DeletePermissionResponse>({
    queryKey: JIRA_ISSUE_DELETE_PERMISSION_QUERY_KEY(issueIdOrKey),
    enabled: !!issueIdOrKey,

    queryFn: async () => {
      const res = await apiClient.get('/jira/permissions', {
        params: { issueIdOrKey },
      });

      return res.data;
    },
  });
};
