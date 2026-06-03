import type { WorkBreakdown } from "@mp/ai";
import { usePlatformApiPaths } from "@mp/task-core";
import { useQuery } from "@tanstack/react-query";

import { WORKBREAKDOWN_QUERY_KEY } from "./useParseRequirements";

const DRAFT_STALE_TIME_MS = 2 * 60 * 1000;

export function useWorkBreakdownDraft(draftId: string | null) {
  const { paths } = usePlatformApiPaths();

  return useQuery({
    queryKey: [WORKBREAKDOWN_QUERY_KEY, draftId],
    queryFn: async (): Promise<WorkBreakdown> => {
      const base =
        paths.workbreakdownDraft?.(draftId!) ?? `/workbreakdown/${encodeURIComponent(draftId!)}`;
      const url = base.startsWith("/api") ? base : `/api${base}`;
      const res = await fetch(url);
      if (!res.ok) {
        if (res.status === 404) throw new Error("Draft not found.");
        throw new Error("Failed to load draft.");
      }
      return res.json();
    },
    enabled: Boolean(draftId),
    staleTime: DRAFT_STALE_TIME_MS,
  });
}
