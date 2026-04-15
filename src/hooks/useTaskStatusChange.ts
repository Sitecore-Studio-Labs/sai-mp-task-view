import { useMutation, useQueryClient } from "@tanstack/react-query";

import { apiClient } from "@/lib/axiosClient";

import { PLATFORM_TASKS_QUERY_KEY } from "./useProjectTasks";

export interface TaskStatusChangePayload {
  taskId: string;
  transitionId: string;
}

export function useTaskStatusChange() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (payload: TaskStatusChangePayload) => {
      const res = await apiClient.post(`/platform/tasks/${payload.taskId}/transitions`, {
        transitionId: payload.transitionId,
      });
      return res.data;
    },
    onSuccess: (_data, variables) => {
      queryClient.invalidateQueries({ queryKey: ["platform", "tasks", variables.taskId] });
      queryClient.invalidateQueries({ queryKey: PLATFORM_TASKS_QUERY_KEY });
    },
  });
}
