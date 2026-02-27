import { useMutation, useQueryClient } from '@tanstack/react-query';
import { apiClient } from '@/lib/axiosClient';
import { JIRA_BOARD_ISSUES_INVALIDATE_KEY } from '@/constants/queryKeys';

export const useDeleteIssue = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (issueIdOrKey: string) => {
      await apiClient.delete(`/jira/issues/${issueIdOrKey}`);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({
        queryKey: JIRA_BOARD_ISSUES_INVALIDATE_KEY,
      });
    },
  });
};
