"use client";

import type { PlatformSetupMapping } from "@mp/task-core";
import { usePlatformApiPaths } from "@mp/task-core";
import { useQuery } from "@tanstack/react-query";

export const PLATFORM_SETUP_MAPPINGS_QUERY_KEY = ["platform", "setup", "mappings"] as const;

export const SETUP_MAPPINGS_QUERY_KEY = ["setup", "mappings"] as const;

export function usePlatformSetupMappings() {
  const { client, paths } = usePlatformApiPaths();
  return useQuery({
    queryKey: PLATFORM_SETUP_MAPPINGS_QUERY_KEY,
    queryFn: async (): Promise<PlatformSetupMapping[]> => {
      if (!paths.setupMappings) return [];
      const res = await client.get<PlatformSetupMapping[]>(paths.setupMappings);
      return res.data;
    },
  });
}
