"use client";

import type { PlatformTransition } from "@mp/task-core";
import { usePlatformApiPaths } from "@mp/task-core";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";

export function usePlatformTransitions(issueKey: string) {
  const { client, paths } = usePlatformApiPaths();
  return useQuery({
    queryKey: ["platform", "transitions", issueKey],
    queryFn: async (): Promise<PlatformTransition[]> => {
      if (!paths.issueTransitions) return [];
      const res = await client.get<{ transitions: PlatformTransition[] }>(
        paths.issueTransitions(issueKey),
      );
      return res.data.transitions;
    },
    enabled: !!issueKey && !!paths.issueTransitions,
  });
}

export function usePlatformStatusChange() {
  const { client, paths } = usePlatformApiPaths();
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async ({
      issueIdOrKey,
      transitionId,
    }: {
      issueIdOrKey: string;
      transitionId: string;
    }) => {
      if (!paths.transitionIssue) throw new Error("Status transitions not supported");
      const res = await client.post(paths.transitionIssue(issueIdOrKey), { transitionId });
      return res.data;
    },
    onSuccess: (_data, { issueIdOrKey }) => {
      queryClient.invalidateQueries({ queryKey: ["platform", "issue", issueIdOrKey] });
      queryClient.invalidateQueries({ queryKey: ["platform", "issues"] });
    },
  });
}
