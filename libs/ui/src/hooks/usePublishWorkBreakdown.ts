import type { PublishResult } from "@mp/ai";
import { usePlatformApiPaths } from "@mp/task-core";
import { useMutation, useQueryClient } from "@tanstack/react-query";

import { WORKBREAKDOWN_QUERY_KEY } from "./useParseRequirements";

export function usePublishWorkBreakdown(
  draftId: string | null,
  options?: { onSuccess?: (result: PublishResult) => void },
) {
  const { paths } = usePlatformApiPaths();
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({ projectId }: { projectId: string }): Promise<PublishResult> => {
      const base =
        paths.workbreakdownPublish?.(draftId!) ??
        `/workbreakdown/${encodeURIComponent(draftId!)}/publish`;
      const url = base.startsWith("/api") ? base : `/api${base}`;
      const res = await fetch(url, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ projectId }),
      });
      if (!res.ok) {
        const data = await res.json().catch(() => ({}));
        throw new Error(data?.error ?? data?.details ?? "Publish failed.");
      }
      return res.json();
    },
    onSuccess: (result) => {
      if (draftId) queryClient.invalidateQueries({ queryKey: [WORKBREAKDOWN_QUERY_KEY, draftId] });
      options?.onSuccess?.(result);
    },
  });
}
