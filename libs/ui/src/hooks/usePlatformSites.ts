"use client";

import type { PlatformSitesResponse } from "@mp/task-core";
import { usePlatformApiPaths } from "@mp/task-core";
import { useQuery } from "@tanstack/react-query";

export function usePlatformSites() {
  const { client, paths } = usePlatformApiPaths();
  return useQuery({
    queryKey: ["platform", "sites"],
    queryFn: async (): Promise<PlatformSitesResponse> => {
      if (!paths.sites) return { resources: [], selectedSite: null, selectedProject: null };
      const res = await client.get<PlatformSitesResponse>(paths.sites);
      return res.data;
    },
  });
}
