"use client";

import type { PlatformSetupResponse } from "@mp/task-core";
import { usePlatformApiPaths } from "@mp/task-core";
import { useQuery } from "@tanstack/react-query";

export const PLATFORM_SETUP_QUERY_KEY = ["platform", "setup"] as const;

export function usePlatformSetup() {
  const { client, paths } = usePlatformApiPaths();
  return useQuery({
    queryKey: PLATFORM_SETUP_QUERY_KEY,
    queryFn: async (): Promise<PlatformSetupResponse> => {
      if (!paths.setup) return { connected: false, setup: null, mappings: [] };
      const res = await client.get<PlatformSetupResponse>(paths.setup);
      return res.data;
    },
  });
}
