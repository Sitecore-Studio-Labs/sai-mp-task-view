import { useMutation, useQueryClient } from "@tanstack/react-query";
import { WORKBREAKDOWN_QUERY_KEY } from "./useParseRequirements";
import type { WorkBreakdown } from "@/types/workbreakdown";
import type { WorkItemType } from "@/types/workbreakdown";

type PatchBody =
  | {
      op: "updateNode";
      itemId: string;
      payload: Partial<{
        title: string;
        description: string;
        type: WorkItemType;
        metadata: Record<string, unknown>;
      }>;
    }
  | { op: "deleteNode"; itemId: string }
  | {
      op: "addChild";
      parentId: string | null;
      item: {
        type: WorkItemType;
        title?: string;
        description?: string;
        metadata?: Record<string, unknown>;
      };
    };

async function patchDraft(draftId: string, body: PatchBody): Promise<WorkBreakdown> {
  const res = await fetch(`/api/workbreakdown/${encodeURIComponent(draftId)}`, {
    method: "PATCH",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(body),
  });
  if (!res.ok) {
    const data = await res.json().catch(() => ({}));
    throw new Error(data?.error ?? "Failed to update draft.");
  }
  return res.json();
}

export function usePatchWorkBreakdown(draftId: string | null, options?: { onSuccess?: () => void }) {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (body: PatchBody) => patchDraft(draftId!, body),
    onSuccess: (updated) => {
      if (draftId) {
        queryClient.setQueryData([WORKBREAKDOWN_QUERY_KEY, draftId], updated);
      }
      options?.onSuccess?.();
    },
  });
}
