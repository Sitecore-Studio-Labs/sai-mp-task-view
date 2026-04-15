import { useQuery } from "@tanstack/react-query";

import { apiClient } from "@/lib/axiosClient";
import type { PlatformTask } from "@/types/platform-entities";

export function useTaskDetails(taskId: string) {
  return useQuery({
    queryKey: ["platform", "tasks", taskId],
    queryFn: async (): Promise<PlatformTask> => {
      const res = await apiClient.get<PlatformTask>(`/platform/tasks/${taskId}`);
      return res.data;
    },
    enabled: !!taskId,
  });
}
