import { useMutation, useQueryClient } from "@tanstack/react-query";
import { WORKBREAKDOWN_QUERY_KEY } from "./useParseRequirements";
import type { PublishResult } from "@/types/workbreakdown-publish";

async function publishDraft(
  draftId: string,
  projectId: string,
): Promise<PublishResult> {
  const res = await fetch(
    `/api/workbreakdown/${encodeURIComponent(draftId)}/publish`,
    {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ projectId }),
    },
  );
  if (!res.ok) {
    const data = await res.json().catch(() => ({}));
    throw new Error(data?.error ?? data?.details ?? "Publish failed.");
  }
  return res.json();
}

export function usePublishWorkBreakdown(draftId: string | null, options?: {
  onSuccess?: (result: PublishResult) => void;
}) {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({ projectId }: { projectId: string }) =>
      publishDraft(draftId!, projectId),
    onSuccess: (result) => {
      if (draftId) {
        queryClient.invalidateQueries({ queryKey: [WORKBREAKDOWN_QUERY_KEY, draftId] });
      }
      options?.onSuccess?.(result);
    },
  });
}
