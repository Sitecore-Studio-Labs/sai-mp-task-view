"use client";

import type {
  ParentIssueOption,
  PlatformTask,
  PlatformTasksPageResponse,
  TaskFilters,
} from "@mp/task-core";
import { usePlatformApiPaths } from "@mp/task-core";
import { useInfiniteQuery, useQuery } from "@tanstack/react-query";

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

function mapToParentIssueOption(task: PlatformTask): ParentIssueOption {
  return {
    id: task.id,
    key: task.key,
    summary: task.fields.summary,
    issueType: task.fields.issuetype
      ? { name: task.fields.issuetype.name, iconUrl: task.fields.issuetype.iconUrl }
      : undefined,
  };
}

export function usePlatformProjectIssues(projectKey: string | null, searchQuery?: string) {
  const { client, paths } = usePlatformApiPaths();
  return useQuery({
    queryKey: ["platform", "projectIssues", projectKey, searchQuery ?? ""],
    queryFn: async (): Promise<ParentIssueOption[]> => {
      if (!projectKey?.trim()) return [];
      const res = await client.get<PlatformTasksPageResponse>(paths.issues, {
        params: { projectKey: projectKey.trim(), query: searchQuery || undefined },
      });
      return (res.data.issues ?? []).map(mapToParentIssueOption);
    },
    enabled: !!projectKey?.trim(),
  });
}
