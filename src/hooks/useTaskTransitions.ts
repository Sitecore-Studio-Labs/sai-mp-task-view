import { useQuery } from "@tanstack/react-query";

import { apiClient } from "@/lib/axiosClient";
import type { PlatformTransition } from "@/types/platform-entities";

export function useTaskTransitions(taskId: string) {
  return useQuery<PlatformTransition[]>({
    queryKey: ["platform", "transitions", taskId],
    queryFn: async () => {
      const res = await apiClient.get<{ transitions: PlatformTransition[] }>(
        `/platform/tasks/${taskId}/transitions`,
      );
      return res.data.transitions;
    },
    enabled: !!taskId,
  });
}
