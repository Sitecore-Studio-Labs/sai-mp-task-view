"use client";

import type { PriorityOption } from "@mp/task-core";
import { usePlatformApiPaths } from "@mp/task-core";
import { useQuery } from "@tanstack/react-query";

export function usePlatformPriorities(projectKey: string | null) {
  const { client, paths } = usePlatformApiPaths();
  return useQuery({
    queryKey: ["platform", "priorities", projectKey],
    queryFn: async (): Promise<PriorityOption[]> => {
      if (!paths.projectPriorities) return [];
      const res = await client.get<{ id?: string; name?: string; iconUrl?: string }[]>(
        paths.projectPriorities,
        { params: { projectKey } },
      );
      return res.data
        .filter((p): p is PriorityOption & { id: string; name: string } => !!p.id && !!p.name)
        .map((p) => ({ id: p.id, name: p.name, iconUrl: p.iconUrl }));
    },
    enabled: !!projectKey && !!paths.projectPriorities,
  });
}
