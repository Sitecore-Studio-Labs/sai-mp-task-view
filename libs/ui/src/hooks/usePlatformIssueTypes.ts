"use client";

import type { IssueTypeOption } from "@mp/task-core";
import { usePlatformApiPaths } from "@mp/task-core";
import { useQuery } from "@tanstack/react-query";

export function usePlatformIssueTypes(projectId: string | null) {
  const { client, paths } = usePlatformApiPaths();
  return useQuery({
    queryKey: ["platform", "issueTypes", projectId],
    queryFn: async (): Promise<IssueTypeOption[]> => {
      if (!projectId || !paths.issueTypes) return [];
      const res = await client.get<IssueTypeOption[]>(paths.issueTypes, {
        params: { projectId },
      });
      return res.data;
    },
    enabled: !!projectId && !!paths.issueTypes,
  });
}
