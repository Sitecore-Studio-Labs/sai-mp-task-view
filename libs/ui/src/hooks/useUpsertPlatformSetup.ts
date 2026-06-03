"use client";

import type {
  PlatformSetupRecord,
  PlatformSetupResponse,
  UpsertPlatformSetupPayload,
} from "@mp/task-core";
import { usePlatformApiPaths } from "@mp/task-core";
import { useMutation, useQueryClient } from "@tanstack/react-query";

import { PLATFORM_SETUP_QUERY_KEY } from "./usePlatformSetup";

export function useUpsertPlatformSetup() {
  const { client, paths } = usePlatformApiPaths();
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (payload: UpsertPlatformSetupPayload): Promise<PlatformSetupRecord> => {
      if (!paths.setup) throw new Error("Platform setup endpoint is not configured.");
      const res = await client.post<PlatformSetupRecord>(paths.setup, payload);
      return res.data;
    },
    onSuccess: (data) => {
      queryClient.setQueryData<PlatformSetupResponse>(PLATFORM_SETUP_QUERY_KEY, (old) => ({
        connected: true,
        setup: data,
        mappings: old?.mappings ?? [],
      }));
      void queryClient.invalidateQueries({ queryKey: ["platform", "sites"] });
      void queryClient.invalidateQueries({ queryKey: ["platform", "projects"] });
    },
  });
}
