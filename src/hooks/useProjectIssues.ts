import { apiClient } from '@/lib/axiosClient';
import { useInfiniteQuery } from '@tanstack/react-query';
import { JIRA_BOARD_ISSUES_QUERY_KEY } from '@/constants/queryKeys';

export const useBoardIssues = (
  projectKey: string | null,
  filters: {
    assignee: string[];
    priority: string[];
    status: string[];
  },
) => {
  return useInfiniteQuery({
    queryKey: JIRA_BOARD_ISSUES_QUERY_KEY(projectKey, filters),
    enabled: !!projectKey,

    queryFn: async ({ pageParam }) => {
      const params = new URLSearchParams();

      if (pageParam) {
        params.append('cursor', pageParam);
      }

      filters.status.forEach((s) => params.append('status', s));
      filters.priority.forEach((p) => params.append('priority', p));
      filters.assignee.forEach((a) => params.append('assignee', a));

      const res = await apiClient.get(`/jira/issues?${params.toString()}`, {
        params: { project: projectKey, cursor: pageParam },
      });

      return res.data;
    },
    initialPageParam: undefined,
    getNextPageParam: (lastPage) =>
      lastPage.isLast ? undefined : lastPage.nextPageToken,
  });
};
