"use client";

import { usePlatformApiPaths } from "@mp/task-core";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";

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

export function usePlatformDisconnect() {
  const { client, paths } = usePlatformApiPaths();
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async () => {
      const res = await client.post(paths.disconnect);
      return res.data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["platform", "connectionStatus"] });
      queryClient.invalidateQueries({ queryKey: ["platform", "sites"] });
      queryClient.invalidateQueries({ queryKey: ["platform", "projects"] });
      queryClient.invalidateQueries({ queryKey: ["platform", "issues"] });
    },
  });
}
