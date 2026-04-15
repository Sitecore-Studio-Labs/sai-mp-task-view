import { useQuery } from "@tanstack/react-query";

import { apiClient } from "@/lib/axiosClient";
import type { PlatformPriority } from "@/types/platform-entities";

export const PLATFORM_PRIORITIES_QUERY_KEY = ["platform", "priorities"] as const;

export function usePriorities(projectId: string | null) {
  return useQuery({
    queryKey: [...PLATFORM_PRIORITIES_QUERY_KEY, projectId],
    queryFn: async (): Promise<PlatformPriority[]> => {
      const res = await apiClient.get<PlatformPriority[]>("/platform/priorities", {
        params: { projectId },
      });
      return res.data;
    },
    enabled: !!projectId,
  });
}
