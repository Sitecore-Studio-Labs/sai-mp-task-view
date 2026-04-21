import { useQuery } from "@tanstack/react-query";

import { jiraExtension } from "@/lib/jira-extension";
import type { JiraIssueTransition } from "@/types/jira";

export type { JiraIssueTransition } from "@/types/jira";

export const useIssueTransitions = (issueIdOrKey: string) => {
  return useQuery<JiraIssueTransition[]>({
    queryKey: ["jira-transitions", issueIdOrKey],
    queryFn: async () => {
      return jiraExtension.getIssueTransitions(issueIdOrKey);
    },
    enabled: !!issueIdOrKey,
  });
};
