"use client";

import type { PlatformProjectStatuses } from "@mp/task-core";
import { usePlatformApiPaths } from "@mp/task-core";
import { useQuery } from "@tanstack/react-query";

export function usePlatformStatuses(projectKey?: string) {
  const { client, paths } = usePlatformApiPaths();
  return useQuery({
    queryKey: ["platform", "statuses", projectKey],
    queryFn: async (): Promise<PlatformProjectStatuses[]> => {
      if (!projectKey || !paths.projectStatuses) return [];
      const res = await client.get<PlatformProjectStatuses[]>(paths.projectStatuses(projectKey));
      return res.data;
    },
    enabled: !!projectKey && !!paths.projectStatuses,
  });
}
