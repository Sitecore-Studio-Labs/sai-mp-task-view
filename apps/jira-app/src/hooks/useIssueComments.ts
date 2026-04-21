import { useQuery } from "@tanstack/react-query";

import { jiraExtension } from "@/lib/jira-extension";
import type { GetCommentsForIssueResponse } from "@/types/jira";

export const useIssueComments = (issueIdOrKey: string | null) => {
  return useQuery({
    queryKey: ["jira", "issueComments", issueIdOrKey],
    enabled: !!issueIdOrKey,

    queryFn: async (): Promise<GetCommentsForIssueResponse> => {
      if (!issueIdOrKey) {
        return { startAt: 0, maxResults: 0, total: 0, comments: [] };
      }
      return jiraExtension.getCommentsForIssue(issueIdOrKey);
    },
  });
};
