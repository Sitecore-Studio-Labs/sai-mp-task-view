"use client";

import type { PlatformProject } from "@mp/task-core";
import { usePlatformApiPaths } from "@mp/task-core";
import { useQuery } from "@tanstack/react-query";

export function usePlatformProjects() {
  const { client, paths } = usePlatformApiPaths();
  return useQuery({
    queryKey: ["platform", "projects"],
    queryFn: async (): Promise<PlatformProject[]> => {
      const res = await client.get<PlatformProject[]>(paths.projects);
      return res.data;
    },
  });
}
