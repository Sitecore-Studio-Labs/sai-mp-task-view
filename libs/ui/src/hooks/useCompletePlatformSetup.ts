"use client";

import type { PlatformSetupResponse } from "@mp/task-core";
import { usePlatformApiPaths } from "@mp/task-core";
import { useMutation, useQueryClient } from "@tanstack/react-query";

import { PLATFORM_SETUP_QUERY_KEY } from "./usePlatformSetup";

export function useCompletePlatformSetup() {
  const { client, paths } = usePlatformApiPaths();
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (): Promise<{ success: boolean }> => {
      if (!paths.setupComplete)
        throw new Error("Platform setup completion endpoint is not configured.");
      const res = await client.post<{ success: boolean }>(paths.setupComplete);
      return res.data;
    },
    onSuccess: async () => {
      await queryClient.cancelQueries({ queryKey: PLATFORM_SETUP_QUERY_KEY });
      queryClient.setQueryData<PlatformSetupResponse>(PLATFORM_SETUP_QUERY_KEY, (old) => {
        if (!old?.setup) return old;
        return {
          ...old,
          setup: {
            ...old.setup,
            setupCompletedAt: new Date().toISOString(),
          },
        };
      });
      await queryClient.invalidateQueries({ queryKey: PLATFORM_SETUP_QUERY_KEY });
    },
  });
}
