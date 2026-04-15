import { useQuery } from "@tanstack/react-query";

import { apiClient } from "@/lib/axiosClient";
import type { PlatformStatus } from "@/types/platform-entities";

export function useProjectStatuses(projectId?: string) {
  return useQuery({
    queryKey: ["platform", "statuses", projectId],
    queryFn: async (): Promise<PlatformStatus[]> => {
      if (!projectId) return [];
      const res = await apiClient.get<PlatformStatus[]>("/platform/statuses", {
        params: { projectId },
      });
      return res.data;
    },
    enabled: !!projectId,
  });
}
