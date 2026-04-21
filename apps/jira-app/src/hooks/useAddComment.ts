import { useMutation, useQueryClient } from "@tanstack/react-query";

import { jiraExtension } from "@/lib/jira-extension";
import { CreateCommentPayload } from "@/types/jira";

export const useAddComment = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (payload: CreateCommentPayload) => {
      return jiraExtension.createComment(payload);
    },

    onSuccess: (_data, variables) => {
      queryClient.invalidateQueries({
        queryKey: ["jira", "issueComments", variables.issueIdOrKey],
      });

      queryClient.invalidateQueries({
        queryKey: ["jira", "issues", variables.issueIdOrKey],
      });
    },
  });
};
