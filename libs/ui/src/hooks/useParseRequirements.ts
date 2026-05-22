import type { ParseRequirementsResponse } from "@mp/ai";
import { METRIC, ObservabilityClient } from "@mp/observability";
import { usePlatformApiPaths } from "@mp/task-core";
import { useMutation, useQueryClient } from "@tanstack/react-query";

export const WORKBREAKDOWN_QUERY_KEY = "workbreakdown" as const;

type ParseParams = {
  requirementText: string;
  projectKey?: string;
  platform?: string;
};

export function useParseRequirements(options?: {
  onSuccess?: (data: ParseRequirementsResponse) => void;
}) {
  const { paths } = usePlatformApiPaths();
  const queryClient = useQueryClient();
  const url = paths.parseRequirements ?? "/api/ai/parse-requirements";

  return useMutation({
    mutationFn: async (params: ParseParams): Promise<ParseRequirementsResponse> => {
      const res = await fetch(url.startsWith("/api") ? url : `/api${url}`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(params),
      });
      if (!res.ok) {
        const data = await res.json().catch(() => ({}));
        throw new Error(data?.error ?? data?.details ?? "Failed to parse requirements.");
      }
      return res.json();
    },
    onSuccess: (data) => {
      queryClient.setQueryData([WORKBREAKDOWN_QUERY_KEY, data.draftId], data.workBreakdown);
      ObservabilityClient.getInstance().track({
        eventName: METRIC.AI_BREAKDOWN_GENERATED,
        category: "business",
        properties: { subtaskCount: data.workBreakdown?.subtasks?.length ?? 0 },
      });
      options?.onSuccess?.(data);
    },
  });
}
