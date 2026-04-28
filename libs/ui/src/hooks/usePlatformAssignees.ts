"use client";

import type { PlatformUser } from "@mp/task-core";
import { usePlatformApiPaths } from "@mp/task-core";
import { useQuery } from "@tanstack/react-query";

export function usePlatformAssignees(projectIdOrKey: string | null, searchQuery?: string) {
  const { client, paths } = usePlatformApiPaths();
  return useQuery({
    queryKey: ["platform", "assignees", projectIdOrKey, searchQuery ?? ""],
    queryFn: async (): Promise<PlatformUser[]> => {
      if (!projectIdOrKey || !paths.assignees) return [];
      const res = await client.get<PlatformUser[]>(paths.assignees, {
        params: { projectId: projectIdOrKey, query: searchQuery || undefined },
      });
      return res.data;
    },
    enabled: !!projectIdOrKey && !!paths.assignees,
  });
}
