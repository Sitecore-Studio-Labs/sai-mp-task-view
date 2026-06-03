"use client";

import type { PlatformUser } from "@mp/task-core";
import { usePlatformApiPaths } from "@mp/task-core";
import { useQuery } from "@tanstack/react-query";

export function usePlatformCurrentUser() {
  const { client, paths } = usePlatformApiPaths();
  return useQuery({
    queryKey: ["platform", "currentUser"],
    queryFn: async (): Promise<PlatformUser> => {
      if (!paths.currentUser) return {};
      const res = await client.get<PlatformUser>(paths.currentUser);
      return res.data;
    },
    enabled: !!paths.currentUser,
  });
}
