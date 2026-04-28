"use client";

import type { PlatformTasksPageResponse, TaskFilters } from "@mp/task-core";
import { usePlatformApiPaths } from "@mp/task-core";
import { useInfiniteQuery } from "@tanstack/react-query";

export function usePlatformIssues(projectKey: string | null, filters: TaskFilters) {
  const { client, paths } = usePlatformApiPaths();
  return useInfiniteQuery<PlatformTasksPageResponse>({
    queryKey: ["platform", "issues", projectKey, filters],
    queryFn: async ({ pageParam }) => {
      const res = await client.get<PlatformTasksPageResponse>(paths.issues, {
        params: {
          projectKey,
          nextPageToken: pageParam ?? undefined,
          assignee: filters.assignee.join(",") || undefined,
          priority: filters.priority.join(",") || undefined,
          status: filters.status.join(",") || undefined,
        },
      });
      return res.data;
    },
    initialPageParam: undefined,
    getNextPageParam: (lastPage) => (lastPage.isLast ? undefined : lastPage.nextPageToken),
    enabled: !!projectKey,
  });
}
