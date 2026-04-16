import { useMutation, useQueryClient } from "@tanstack/react-query";

import type { ParseRequirementsResponse } from "@/types/workbreakdown";

const PARSE_REQUIREMENTS_URL = "/api/ai/parse-requirements";

export const WORKBREAKDOWN_QUERY_KEY = "workbreakdown" as const;

type ParseParams = {
  requirementText: string;
  projectKey?: string;
  platform?: string;
};

async function parseRequirements(params: ParseParams): Promise<ParseRequirementsResponse> {
  const res = await fetch(PARSE_REQUIREMENTS_URL, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      requirementText: params.requirementText,
      projectKey: params.projectKey,
      platform: params.platform,
    }),
  });
  if (!res.ok) {
    const data = await res.json().catch(() => ({}));
    throw new Error(data?.error ?? data?.details ?? "Failed to parse requirements.");
  }
  return res.json();
}

export function useParseRequirements(options?: {
  onSuccess?: (data: ParseRequirementsResponse) => void;
}) {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: parseRequirements,
    onSuccess: (data) => {
      queryClient.setQueryData([WORKBREAKDOWN_QUERY_KEY, data.draftId], data.workBreakdown);
      options?.onSuccess?.(data);
    },
  });
}
