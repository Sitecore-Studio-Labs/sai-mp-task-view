import { useQuery } from "@tanstack/react-query";

import { apiClient } from "@/lib/axiosClient";
import type { PlatformCommentsResponse } from "@/types/platform-entities";

export function useTaskComments(taskId: string | null) {
  return useQuery({
    queryKey: ["platform", "comments", taskId],
    enabled: !!taskId,
    queryFn: async (): Promise<PlatformCommentsResponse> => {
      const res = await apiClient.get<PlatformCommentsResponse>("/platform/comments", {
        params: { taskId },
      });
      return res.data;
    },
  });
}
