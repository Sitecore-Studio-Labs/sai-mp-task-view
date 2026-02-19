import { apiClient } from "@/lib/axiosClient";
import { useInfiniteQuery } from "@tanstack/react-query";

export const useBoardIssues = (projectKey: string | null) => {
  return useInfiniteQuery({
    queryKey: ["jira", "boardIssues", projectKey ?? "none"],
    enabled: !!projectKey,

    queryFn: async ({ pageParam }) => {
      const res = await apiClient.get(
        `/jira/issues`,
        { params: { project: projectKey, cursor: pageParam } }
      );
      return res.data;
    },
    initialPageParam: undefined,
    getNextPageParam: (lastPage) =>
      lastPage.isLast ? undefined : lastPage.nextPageToken,
  });
};
