import { useMutation, useQueryClient } from "@tanstack/react-query";

import { apiClient } from "@/lib/axiosClient";

import { PLATFORM_TASKS_QUERY_KEY } from "./useProjectTasks";

export function useDeleteTask() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (taskId: string) => {
      await apiClient.delete(`/platform/tasks/${taskId}`);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: PLATFORM_TASKS_QUERY_KEY });
    },
  });
}
