import { useQuery } from '@tanstack/react-query';
import type { JiraIssueType } from '@/types/jira';
import { apiClient } from '@/lib/axiosClient';

const JIRA_ISSUE_TYPES_QUERY_KEY = ['jira', 'issue-types'] as const;

export function useJiraIssueTypes(projectIdOrKey: string | null) {
  return useQuery({
    queryKey: [...JIRA_ISSUE_TYPES_QUERY_KEY, projectIdOrKey],
    queryFn: async (): Promise<JiraIssueType[]> => {
      if (!projectIdOrKey) return [];
      const res = await apiClient.get<JiraIssueType[]>('/jira/issue-types', {
        params: { projectId: projectIdOrKey },
      });
      return res.data;
    },
    enabled: !!projectIdOrKey,
  });
}
