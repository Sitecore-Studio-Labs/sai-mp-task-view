import { apiClient } from '@/lib/axiosClient';
import { CreateCommentPayload } from '@/types/jira';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import {
  JIRA_ISSUE_COMMENTS_QUERY_KEY,
  JIRA_ISSUE_QUERY_KEY,
} from '@/constants/queryKeys';

export const useAddComment = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (payload: CreateCommentPayload) => {
      const response = await apiClient.post('/jira/comments', payload);
      return response.data;
    },

    onSuccess: (_data, variables) => {
      queryClient.invalidateQueries({
        queryKey: JIRA_ISSUE_COMMENTS_QUERY_KEY(variables.issueIdOrKey),
      });

      queryClient.invalidateQueries({
        queryKey: JIRA_ISSUE_QUERY_KEY(variables.issueIdOrKey),
      });
    },
  });
};
