"use client";

import type { PlatformPermissionResponse } from "@mp/task-core";
import { usePlatformApiPaths } from "@mp/task-core";
import { useQuery } from "@tanstack/react-query";

export function usePlatformPermissions({
  permission,
  projectKey,
}: {
  permission: string;
  projectKey: string | null;
}) {
  const { client, paths } = usePlatformApiPaths();
  return useQuery({
    queryKey: ["platform", "permissions", permission, projectKey],
    queryFn: async (): Promise<PlatformPermissionResponse> => {
      if (!paths.permissions) return { hasPermission: true };
      const res = await client.get<PlatformPermissionResponse>(paths.permissions, {
        params: { permission, projectKey },
      });
      return res.data;
    },
    enabled: !!projectKey,
  });
}
