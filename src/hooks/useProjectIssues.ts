import { apiClient } from "@/lib/axiosClient";
import { useInfiniteQuery } from "@tanstack/react-query";

export const useProjectIssues = (
  projectKey: string | null,
  filters: {
    assignee: string[];
    priority: string[];
    status: string[];
  },
) => {
  return useInfiniteQuery({
    queryKey: [
      "jira",
      "boardIssues",
      projectKey ?? "none",
      filters.status.join(","),
      filters.priority.join(","),
      filters.assignee.join(","),
    ],
    enabled: !!projectKey,

    queryFn: async ({ pageParam }) => {
      const params = new URLSearchParams();

      if (pageParam) {
        params.append("cursor", pageParam);
      }

      filters.status.forEach((s) => params.append("status", s));
      filters.priority.forEach((p) => params.append("priority", p));
      filters.assignee.forEach((a) => params.append("assignee", a));

      const res = await apiClient.get(`/jira/issues?${params.toString()}`, {
        params: { projectKey, cursor: pageParam },
      });

      return res.data;
    },
    initialPageParam: undefined,
    getNextPageParam: (lastPage) =>
      lastPage.isLast ? undefined : lastPage.nextPageToken,
  });
};
