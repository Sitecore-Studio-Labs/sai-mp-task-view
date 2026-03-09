import { apiClient } from "@/lib/axiosClient";
import { useMutation } from "@tanstack/react-query";
import type { UpdateTaskPayload } from "@/contexts/EditTaskContext";

export function useUpdateJiraTask(issueIdOrKey: string) {
  return useMutation({
    mutationFn: async (payload: UpdateTaskPayload): Promise<void> => {
      await apiClient.patch(`/jira/issues/${issueIdOrKey}`, payload);
    },
  });
}

