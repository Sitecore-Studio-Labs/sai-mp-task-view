import { useQuery } from "@tanstack/react-query";

import { apiClient } from "@/lib/axiosClient";
import type { PlatformIssueType } from "@/types/platform-entities";

export const PLATFORM_ISSUE_TYPES_QUERY_KEY = ["platform", "issue-types"] as const;

export function useIssueTypes(projectId: string | null) {
  return useQuery({
    queryKey: [...PLATFORM_ISSUE_TYPES_QUERY_KEY, projectId],
    queryFn: async (): Promise<PlatformIssueType[]> => {
      if (!projectId) return [];
      const res = await apiClient.get<PlatformIssueType[]>("/platform/issue-types", {
        params: { projectId },
      });
      return res.data;
    },
    enabled: !!projectId,
  });
}
