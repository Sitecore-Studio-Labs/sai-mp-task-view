import { useMutation, useQueryClient } from "@tanstack/react-query";

import { jiraExtension } from "@/lib/jira-extension";

export interface TransitionIssuePayload {
  issueIdOrKey: string;
  transitionId: string;
}

export const useIssueStatusChange = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (payload: TransitionIssuePayload) => {
      return jiraExtension.transitionIssue(payload.issueIdOrKey, payload.transitionId);
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
