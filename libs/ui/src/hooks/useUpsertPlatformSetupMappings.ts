"use client";

import type {
  PlatformSetupMapping,
  PlatformSetupResponse,
  UpsertPlatformSetupMappingsPayload,
} from "@mp/task-core";
import { usePlatformApiPaths } from "@mp/task-core";
import { useMutation, useQueryClient } from "@tanstack/react-query";

import { PLATFORM_SETUP_QUERY_KEY } from "./usePlatformSetup";
import { PLATFORM_SETUP_MAPPINGS_QUERY_KEY } from "./usePlatformSetupMappings";

export function useUpsertPlatformSetupMappings() {
  const { client, paths } = usePlatformApiPaths();
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (
      payload: UpsertPlatformSetupMappingsPayload,
    ): Promise<PlatformSetupMapping[]> => {
      if (!paths.setupMappings)
        throw new Error("Platform setup mappings endpoint is not configured.");
      const res = await client.put<PlatformSetupMapping[]>(paths.setupMappings, payload);
      return res.data;
    },
    onSuccess: (mappings) => {
      void queryClient.invalidateQueries({ queryKey: PLATFORM_SETUP_MAPPINGS_QUERY_KEY });
      queryClient.setQueryData<PlatformSetupResponse>(PLATFORM_SETUP_QUERY_KEY, (old) =>
        old ? { ...old, mappings } : old,
      );
    },
  });
}
