import { useQuery } from "@tanstack/react-query";

import { apiClient } from "@/lib/axiosClient";
import type { ParentIssueOption } from "@/types/create-task";
import type { PlatformTaskListResponse } from "@/types/platform-entities";

const PARENT_TASKS_QUERY_KEY = ["platform", "parentTasks"] as const;

export function useParentTasks(
  projectId: string | null,
  searchQuery?: string,
  excludeTaskKey?: string,
) {
  return useQuery({
    queryKey: [...PARENT_TASKS_QUERY_KEY, projectId, searchQuery ?? ""],
    queryFn: async (): Promise<ParentIssueOption[]> => {
      if (!projectId?.trim()) return [];
      const params = new URLSearchParams({ projectId: projectId.trim() });
      if (searchQuery?.trim()) params.append("query", searchQuery.trim());

      const res = await apiClient.get<PlatformTaskListResponse>(
        `/platform/tasks?${params.toString()}`,
      );
      const tasks = res.data?.tasks ?? [];
      return tasks
        .filter((t) => t.key !== excludeTaskKey)
        .map((t) => ({
          id: t.id,
          key: t.key,
          summary: t.summary,
          issueType: t.issueType
            ? { name: t.issueType.name, iconUrl: t.issueType.iconUrl }
            : undefined,
        }));
    },
    enabled: !!projectId?.trim(),
  });
}
