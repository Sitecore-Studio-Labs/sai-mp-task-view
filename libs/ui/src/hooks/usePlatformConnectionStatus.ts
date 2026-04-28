"use client";

import { usePlatformApiPaths } from "@mp/task-core";
import { useQuery } from "@tanstack/react-query";

export function usePlatformConnectionStatus() {
  const { client, paths } = usePlatformApiPaths();
  return useQuery({
    queryKey: ["platform", "connectionStatus"],
    queryFn: async (): Promise<{ connected: boolean }> => {
      const res = await client.get<{ connected: boolean }>(paths.connectionStatus);
      return res.data;
    },
  });
}
