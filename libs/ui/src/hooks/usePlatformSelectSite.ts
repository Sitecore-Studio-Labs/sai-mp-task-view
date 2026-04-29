"use client";

import type { PlatformSitesResponse } from "@mp/task-core";
import { usePlatformApiPaths } from "@mp/task-core";
import { useMutation, useQueryClient } from "@tanstack/react-query";

export function usePlatformSelectSite() {
  const { client, paths } = usePlatformApiPaths();
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (payload: { siteId: string }) => {
      if (!paths.selectSite) throw new Error("Site selection not supported");
      const res = await client.post(paths.selectSite, payload);
      return res.data;
    },
    onMutate: async ({ siteId }) => {
      if (!paths.selectSite) return;
      await queryClient.cancelQueries({ queryKey: ["platform", "sites"] });
      const previous = queryClient.getQueryData<PlatformSitesResponse>(["platform", "sites"]);
      queryClient.setQueryData<PlatformSitesResponse>(["platform", "sites"], (old) => {
        if (!old) return old;
        return { ...old, selectedSite: siteId };
      });
      return { previous };
    },
    onError: (_err, _vars, context) => {
      if (context?.previous !== undefined) {
        queryClient.setQueryData(["platform", "sites"], context.previous);
      }
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["platform", "sites"] });
      queryClient.invalidateQueries({ queryKey: ["platform", "projects"] });
    },
  });
}
