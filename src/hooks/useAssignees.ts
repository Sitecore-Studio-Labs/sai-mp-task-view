import { useQuery } from "@tanstack/react-query";

import { apiClient } from "@/lib/axiosClient";
import type { PlatformUser } from "@/types/platform-entities";

export const PLATFORM_ASSIGNEES_QUERY_KEY = ["platform", "assignees"] as const;

export function useAssignees(projectId: string | null, searchQuery?: string) {
  return useQuery({
    queryKey: [...PLATFORM_ASSIGNEES_QUERY_KEY, projectId, searchQuery ?? ""],
    queryFn: async (): Promise<PlatformUser[]> => {
      if (!projectId) return [];
      const res = await apiClient.get<PlatformUser[]>("/platform/assignees", {
        params: { projectId, query: searchQuery || undefined },
      });
      return res.data;
    },
    enabled: !!projectId,
  });
}
