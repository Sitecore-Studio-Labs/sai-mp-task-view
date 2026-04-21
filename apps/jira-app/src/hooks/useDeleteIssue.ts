import { useMutation, useQueryClient } from "@tanstack/react-query";

import { jiraExtension } from "@/lib/jira-extension";

export const useDeleteIssue = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (issueIdOrKey: string) => {
      await jiraExtension.deleteIssue(issueIdOrKey);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["jira", "issues"] });
      queryClient.invalidateQueries({ queryKey: ["jira", "boardIssues"] });
    },
  });
};
