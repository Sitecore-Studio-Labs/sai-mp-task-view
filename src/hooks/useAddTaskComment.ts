import { useMutation, useQueryClient } from "@tanstack/react-query";

import { apiClient } from "@/lib/axiosClient";
import type { PlatformCreateCommentPayload } from "@/types/platform-entities";

export function useAddTaskComment() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (payload: PlatformCreateCommentPayload) => {
      const res = await apiClient.post("/platform/comments", payload);
      return res.data;
    },
    onSuccess: (_data, variables) => {
      queryClient.invalidateQueries({ queryKey: ["platform", "comments", variables.taskId] });
      queryClient.invalidateQueries({ queryKey: ["platform", "tasks", variables.taskId] });
    },
  });
}
