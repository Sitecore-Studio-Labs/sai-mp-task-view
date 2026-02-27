import { apiClient } from '@/lib/axiosClient';
import { JiraIssue } from '@/types/jira';
import { useQuery } from '@tanstack/react-query';
import { JIRA_ISSUE_QUERY_KEY } from '@/constants/queryKeys';

export const useIssueDetails = (issueIdOrKey: string) => {
  return useQuery({
    queryKey: JIRA_ISSUE_QUERY_KEY(issueIdOrKey),
    queryFn: async (): Promise<JiraIssue> => {
      const response = await apiClient.get<JiraIssue>(
        `/jira/issues/${issueIdOrKey}`,
      );
      return response.data;
    },
    enabled: !!issueIdOrKey,
  });
};
