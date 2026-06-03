"use client";

import type { PlatformTask } from "@mp/task-core";
import { usePlatformApiPaths } from "@mp/task-core";
import { useQuery } from "@tanstack/react-query";

export function usePlatformIssueDetails(issueKey: string) {
  const { client, paths } = usePlatformApiPaths();
  return useQuery({
    queryKey: ["platform", "issue", issueKey],
    queryFn: async (): Promise<PlatformTask> => {
      const res = await client.get<PlatformTask>(paths.issue(issueKey));
      return res.data;
    },
    enabled: !!issueKey,
  });
}
