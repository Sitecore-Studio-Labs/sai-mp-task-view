import { useQuery } from "@tanstack/react-query";

import type { WorkBreakdown } from "@/types/workbreakdown";

import { WORKBREAKDOWN_QUERY_KEY } from "./useParseRequirements";

async function fetchDraft(draftId: string): Promise<WorkBreakdown> {
  const res = await fetch(`/api/workbreakdown/${encodeURIComponent(draftId)}`);
  if (!res.ok) {
    if (res.status === 404) throw new Error("Draft not found.");
    throw new Error("Failed to load draft.");
  }
  return res.json();
}

/** Keep draft data fresh for 2 minutes so we don't refetch immediately after parse (avoids 404 before global store is hit). */
const DRAFT_STALE_TIME_MS = 2 * 60 * 1000;

export function useWorkBreakdownDraft(draftId: string | null) {
  return useQuery({
    queryKey: [WORKBREAKDOWN_QUERY_KEY, draftId],
    queryFn: () => fetchDraft(draftId!),
    enabled: Boolean(draftId),
    staleTime: DRAFT_STALE_TIME_MS,
  });
}
