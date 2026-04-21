import { useInfiniteQuery } from "@tanstack/react-query";

import { jiraExtension } from "@/lib/jira-extension";

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
      if (!projectKey) {
        throw new Error("projectKey is required.");
      }

      return jiraExtension.getProjectIssuesPage({
        projectKey,
        cursor: pageParam as string | undefined,
        filters: {
          status: filters.status,
          priority: filters.priority,
          assignee: filters.assignee,
        },
      });
    },
    initialPageParam: undefined as string | undefined,
    getNextPageParam: (lastPage) => (lastPage.isLast ? undefined : lastPage.nextPageToken),
  });
};
