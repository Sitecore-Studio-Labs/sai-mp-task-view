"use client";

import { usePlatformApiPaths } from "@mp/task-core";
import { useMutation, useQueryClient } from "@tanstack/react-query";

export function usePlatformSelectProject() {
  const { client, paths } = usePlatformApiPaths();
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async ({ projectKey }: { projectKey: string }) => {
      const res = await client.post(paths.selectProject, { projectKey });
      return res.data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["platform", "projects"] });
    },
  });
}
