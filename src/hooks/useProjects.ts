import { useQuery } from "@tanstack/react-query";

import { apiClient } from "@/lib/axiosClient";
import type { PlatformProject } from "@/types/platform-entities";

export const PLATFORM_PROJECTS_QUERY_KEY = ["platform", "projects"] as const;

export function useProjects() {
  return useQuery({
    queryKey: PLATFORM_PROJECTS_QUERY_KEY,
    queryFn: async (): Promise<PlatformProject[]> => {
      const res = await apiClient.get<PlatformProject[]>("/platform/projects");
      return res.data;
    },
  });
}
