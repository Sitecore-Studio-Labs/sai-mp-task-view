"use client";

import type { AssigneeOption, PlatformUser } from "@mp/task-core";
import { usePlatformApiPaths } from "@mp/task-core";
import { useQuery } from "@tanstack/react-query";

function normalizeAssignee(user: PlatformUser | AssigneeOption): AssigneeOption {
  const id = ("accountId" in user && user.accountId) || ("id" in user && user.id) || "";
  const avatarUrl =
    ("avatarUrl" in user && user.avatarUrl) ||
    ("avatarUrls" in user && user.avatarUrls ? Object.values(user.avatarUrls)[0] : undefined);
  return {
    id,
    displayName: (user.displayName ?? id) || "Unknown",
    avatarUrl,
  };
}

export function usePlatformAssignees(projectIdOrKey: string | null, searchQuery?: string) {
  const { client, paths } = usePlatformApiPaths();
  return useQuery({
    queryKey: ["platform", "assignees", projectIdOrKey, searchQuery ?? ""],
    queryFn: async (): Promise<AssigneeOption[]> => {
      if (!projectIdOrKey || !paths.assignees) return [];
      const res = await client.get<(PlatformUser | AssigneeOption)[]>(paths.assignees, {
        params: { projectId: projectIdOrKey, query: searchQuery || undefined },
      });
      return res.data.map(normalizeAssignee);
    },
    enabled: !!projectIdOrKey && !!paths.assignees,
  });
}
