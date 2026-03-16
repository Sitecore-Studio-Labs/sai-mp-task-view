import { useMutation, useQueryClient } from "@tanstack/react-query";

import { apiClient } from "@/lib/axiosClient";

export const useDeleteIssue = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (issueIdOrKey: string) => {
      await apiClient.delete(`/jira/issues/${issueIdOrKey}`);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["jira", "issues"] });
    },
  });
};
