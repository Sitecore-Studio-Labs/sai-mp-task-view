import { useMutation, useQueryClient } from "@tanstack/react-query";

import { apiClient } from "@/lib/axiosClient";

export interface TransitionIssuePayload {
  issueIdOrKey: string;
  transitionId: string;
}

export const useIssueStatusChange = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (payload: TransitionIssuePayload) => {
      const response = await apiClient.post(`/jira/issues/${payload.issueIdOrKey}/transitions`, {
        transitionId: payload.transitionId,
      });
      return response.data;
    },

    onSuccess: (_data, variables) => {
      queryClient.invalidateQueries({
        queryKey: ["jira", "issues", variables.issueIdOrKey],
      });

      queryClient.invalidateQueries({
        queryKey: ["jira", "boardIssues"],
      });
    },
  });
};
