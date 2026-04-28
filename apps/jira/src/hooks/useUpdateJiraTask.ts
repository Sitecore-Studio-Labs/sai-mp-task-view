import type { UpdateTaskPayload } from "@mp/task-core";
import { useMutation } from "@tanstack/react-query";

import { apiClient } from "@/lib/axiosClient";

export function useUpdateJiraTask(issueIdOrKey: string) {
  return useMutation({
    mutationFn: async (payload: UpdateTaskPayload): Promise<void> => {
      await apiClient.patch(`/jira/issues/${issueIdOrKey}`, payload);
    },
  });
}
