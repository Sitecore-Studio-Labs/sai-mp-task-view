import { useMutation } from "@tanstack/react-query";

import type { UpdateTaskPayload } from "@/contexts/EditTaskContext";
import { apiClient } from "@/lib/axiosClient";

export function useUpdateTask(taskId: string) {
  return useMutation({
    mutationFn: async (payload: UpdateTaskPayload): Promise<void> => {
      await apiClient.patch(`/platform/tasks/${taskId}`, payload);
    },
  });
}
