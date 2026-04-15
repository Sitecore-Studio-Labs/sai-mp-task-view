import { useInfiniteQuery } from "@tanstack/react-query";

import { apiClient } from "@/lib/axiosClient";
import type { PlatformTaskListResponse } from "@/types/platform-entities";

export const PLATFORM_TASKS_QUERY_KEY = ["platform", "tasks"] as const;

export function useProjectTasks(
  projectId: string | null,
  filters: { assignee: string[]; priority: string[]; status: string[] },
) {
  return useInfiniteQuery({
    queryKey: [
      ...PLATFORM_TASKS_QUERY_KEY,
      projectId ?? "none",
      filters.status.join(","),
      filters.priority.join(","),
      filters.assignee.join(","),
    ],
    enabled: !!projectId,
    queryFn: async ({ pageParam }): Promise<PlatformTaskListResponse> => {
      const params = new URLSearchParams();
      if (projectId) params.append("projectId", projectId);
      if (pageParam) params.append("cursor", pageParam);
      filters.status.forEach((s) => params.append("status", s));
      filters.priority.forEach((p) => params.append("priority", p));
      filters.assignee.forEach((a) => params.append("assignee", a));

      const res = await apiClient.get<PlatformTaskListResponse>(
        `/platform/tasks?${params.toString()}`,
      );
      return res.data;
    },
    initialPageParam: undefined as string | undefined,
    getNextPageParam: (lastPage) => (lastPage.isLast ? undefined : lastPage.nextCursor),
  });
}
