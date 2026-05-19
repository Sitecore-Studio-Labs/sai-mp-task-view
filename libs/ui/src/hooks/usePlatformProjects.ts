"use client";

import type { PlatformProject } from "@mp/task-core";
import { usePlatformApiPaths } from "@mp/task-core";
import { useQuery } from "@tanstack/react-query";

export function usePlatformProjects(siteId?: string) {
  const { client, paths } = usePlatformApiPaths();
  return useQuery({
    queryKey: ["platform", "projects", siteId ?? "selected-site"],
    enabled: siteId === undefined ? true : Boolean(siteId),
    queryFn: async (): Promise<PlatformProject[]> => {
      const res = await client.get<PlatformProject[]>(paths.projects, {
        params: siteId ? { siteId } : undefined,
      });
      return res.data;
    },
  });
}
