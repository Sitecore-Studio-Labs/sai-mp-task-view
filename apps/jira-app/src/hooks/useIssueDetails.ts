import { useQuery } from "@tanstack/react-query";

import { jiraExtension } from "@/lib/jira-extension";
import { JiraIssue } from "@/types/jira";

export const useIssueDetails = (issueIdOrKey: string) => {
  return useQuery({
    queryKey: ["jira", "issues", issueIdOrKey],
    queryFn: async (): Promise<JiraIssue> => {
      return jiraExtension.getIssueDetails(issueIdOrKey);
    },
    enabled: !!issueIdOrKey,
  });
};
