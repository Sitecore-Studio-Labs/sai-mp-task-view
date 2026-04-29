"use client";

import type { CreateTaskPayload, CreateTaskResult, UpdateTaskPayload } from "@mp/task-core";
import { usePlatformApiPaths } from "@mp/task-core";
import { useMutation, useQueryClient } from "@tanstack/react-query";

export function usePlatformCreateIssue() {
  const { client, paths } = usePlatformApiPaths();
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (payload: CreateTaskPayload): Promise<CreateTaskResult> => {
      const res = await client.post<CreateTaskResult>(paths.issues, payload);
      return res.data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["platform", "issues"] });
      queryClient.invalidateQueries({ queryKey: ["platform", "projects"] });
    },
  });
}

export function usePlatformUpdateIssue(issueKey: string) {
  const { client, paths } = usePlatformApiPaths();
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (payload: UpdateTaskPayload): Promise<void> => {
      await client.patch(paths.issue(issueKey), payload);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["platform", "issue", issueKey] });
      queryClient.invalidateQueries({ queryKey: ["platform", "issues"] });
    },
  });
}

export function usePlatformDeleteIssue() {
  const { client, paths } = usePlatformApiPaths();
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (issueKey: string): Promise<void> => {
      await client.delete(paths.issue(issueKey));
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["platform", "issues"] });
    },
  });
}
