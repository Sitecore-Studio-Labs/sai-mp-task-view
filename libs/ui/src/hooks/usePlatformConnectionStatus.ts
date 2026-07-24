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
    mutationFn: async (options?: { wipe?: boolean } | boolean) => {
      const wipe = typeof options === "boolean" ? options : options?.wipe;
      const res = await client.post(paths.disconnect, wipe === undefined ? undefined : { wipe });
      return res.data;
    },
    onSuccess: (_data, options) => {
      const wipe = typeof options === "boolean" ? options : options?.wipe;
      // Flip UI immediately so connected-only sections hide before status refetch.
      queryClient.setQueryData(["platform", "connectionStatus"], { connected: false });
      queryClient.invalidateQueries({ queryKey: ["platform", "connectionStatus"] });
      queryClient.invalidateQueries({ queryKey: ["platform", "sites"] });
      queryClient.invalidateQueries({ queryKey: ["platform", "projects"] });
      queryClient.invalidateQueries({ queryKey: ["platform", "issues"] });
      if (wipe) {
        queryClient.removeQueries({ queryKey: ["platform", "setup"] });
        queryClient.removeQueries({ queryKey: ["platform", "setup", "mappings"] });
      } else {
        queryClient.invalidateQueries({ queryKey: ["platform", "setup"] });
        queryClient.invalidateQueries({ queryKey: ["platform", "setup", "mappings"] });
      }
    },
  });
}
