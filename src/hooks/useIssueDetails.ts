import { useQuery } from "@tanstack/react-query";

import { apiClient } from "@/lib/axiosClient";
import { JiraIssue } from "@/types/jira";

export const useIssueDetails = (issueIdOrKey: string) => {
  return useQuery({
    queryKey: ["jira", "issues", issueIdOrKey],
    queryFn: async (): Promise<JiraIssue> => {
      const response = await apiClient.get<JiraIssue>(`/jira/issues/${issueIdOrKey}`);
      return response.data;
    },
    enabled: !!issueIdOrKey,
  });
};
