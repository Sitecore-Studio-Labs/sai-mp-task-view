import { useQuery } from "@tanstack/react-query";

import { apiClient } from "@/lib/axiosClient";
import type { JiraStatus } from "@/types/jira";

export type JiraIssueTransition = {
  id: string;
  name: string;
  to: JiraStatus;
};

export const useIssueTransitions = (issueIdOrKey: string) => {
  return useQuery<JiraIssueTransition[]>({
    queryKey: ["jira-transitions", issueIdOrKey],
    queryFn: async () => {
      const response = await apiClient.get<{ transitions: JiraIssueTransition[] }>(
        `/jira/issues/${issueIdOrKey}/transitions`,
      );
      return response.data.transitions;
    },
    enabled: !!issueIdOrKey,
  });
};
