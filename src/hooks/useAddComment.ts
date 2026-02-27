import { apiClient } from "@/lib/axiosClient";
import { CreateCommentPayload } from "@/types/jira";
import { useMutation, useQueryClient } from "@tanstack/react-query";

export const useAddComment = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (payload: CreateCommentPayload) => {
      const response = await apiClient.post("/api/jira/comments", payload);
      return response.data;
    },

    onSuccess: (_data, variables) => {
      queryClient.invalidateQueries({
        queryKey: ["jira-comments", variables.issueIdOrKey],
      });

      queryClient.invalidateQueries({
        queryKey: ["jira-issue", variables.issueIdOrKey],
      });
    },
  });
};