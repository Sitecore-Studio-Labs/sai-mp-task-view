"use client";

import type { AddCommentPayload, PlatformCommentsResponse } from "@mp/task-core";
import { usePlatformApiPaths } from "@mp/task-core";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";

export function usePlatformComments(issueIdOrKey: string | null) {
  const { client, paths } = usePlatformApiPaths();
  return useQuery({
    queryKey: ["platform", "comments", issueIdOrKey],
    queryFn: async (): Promise<PlatformCommentsResponse> => {
      if (!paths.comments) return { startAt: 0, maxResults: 0, total: 0, comments: [] };
      const res = await client.get<PlatformCommentsResponse>(paths.comments, {
        params: { issueIdOrKey },
      });
      return res.data;
    },
    enabled: !!issueIdOrKey && !!paths.comments,
  });
}

export function usePlatformAddComment() {
  const { client, paths } = usePlatformApiPaths();
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (payload: AddCommentPayload) => {
      if (!paths.comments) throw new Error("Comments not supported");
      const res = await client.post(paths.comments, payload);
      return res.data;
    },
    onSuccess: (_data, variables) => {
      queryClient.invalidateQueries({
        queryKey: ["platform", "comments", variables.issueIdOrKey],
      });
    },
  });
}
