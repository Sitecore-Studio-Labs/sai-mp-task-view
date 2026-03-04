import { apiClient } from '@/lib/axiosClient';
import { useMutation, useQueryClient } from '@tanstack/react-query';

export interface TransitionIssuePayload {
  issueIdOrKey: string;
  transitionId: string;
}

export const useIssueStatusChange = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (payload: TransitionIssuePayload) => {
      const response = await apiClient.post(
        '/jira/issues/transition',
        payload,
      );
      return response.data;
    },

    onSuccess: (_data, variables) => {
      queryClient.invalidateQueries({
        queryKey: ['jira-issue', variables.issueIdOrKey],
      });

      queryClient.invalidateQueries({
        queryKey: ['boardIssues'],
      });
    },
  });
};