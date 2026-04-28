"use client";

import type { PlatformPriority } from "@mp/task-core";
import { usePlatformApiPaths } from "@mp/task-core";
import { useQuery } from "@tanstack/react-query";

export function usePlatformPriorities(projectKey: string | null) {
  const { client, paths } = usePlatformApiPaths();
  return useQuery({
    queryKey: ["platform", "priorities", projectKey],
    queryFn: async (): Promise<PlatformPriority[]> => {
      if (!paths.projectPriorities) return [];
      const res = await client.get<PlatformPriority[]>(paths.projectPriorities, {
        params: { projectKey },
      });
      return res.data;
    },
    enabled: !!projectKey && !!paths.projectPriorities,
  });
}
