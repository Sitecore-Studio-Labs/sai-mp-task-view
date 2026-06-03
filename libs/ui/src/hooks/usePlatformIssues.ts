"use client";

import type {
  ParentIssueOption,
  PlatformTask,
  PlatformTasksPageResponse,
  TaskFilters,
} from "@mp/task-core";
import { usePlatformApiPaths } from "@mp/task-core";
import { useInfiniteQuery, useQuery } from "@tanstack/react-query";

function serializeParams(params: Record<string, unknown>): string {
  const sp = new URLSearchParams();
  for (const [key, value] of Object.entries(params)) {
    if (value == null) continue;
    if (Array.isArray(value)) {
      for (const v of value) {
        if (v == null) continue;
        const s = String(v).trim();
        if (s) sp.append(key, s);
      }
      continue;
    }
    const s = String(value).trim();
    if (s) sp.append(key, s);
  }
  return sp.toString();
}

export function usePlatformIssues(projectKey: string | null, filters: TaskFilters) {
  const { client, paths } = usePlatformApiPaths();
  return useInfiniteQuery<PlatformTasksPageResponse>({
    queryKey: ["platform", "issues", projectKey, filters],
    queryFn: async ({ pageParam }) => {
      const res = await client.get<PlatformTasksPageResponse>(paths.issues, {
        params: {
          projectKey,
          nextPageToken: pageParam ?? undefined,
          assignee: filters.assignee.length ? filters.assignee : undefined,
          priority: filters.priority.length ? filters.priority : undefined,
          status: filters.status.length ? filters.status : undefined,
        },
        // Important: our API routes use `searchParams.getAll("status")` style parsing.
        // This serializer emits `status=a&status=b` (not `status[]=a&status[]=b`).
        paramsSerializer: { serialize: serializeParams },
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
