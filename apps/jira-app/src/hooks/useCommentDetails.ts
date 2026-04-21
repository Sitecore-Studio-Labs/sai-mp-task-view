import { useQuery } from "@tanstack/react-query";

import { jiraExtension } from "@/lib/jira-extension";
import { JiraComment } from "@/types/jira";

export const useCommentDetails = (issueIdOrKey: string, commentId: string) => {
  return useQuery({
    queryKey: ["jira-comment-details", issueIdOrKey, commentId],
    queryFn: async (): Promise<JiraComment> => {
      if (!commentId || !issueIdOrKey) {
        throw new Error("Missing commentId or issueIdOrKey");
      }

      return jiraExtension.getCommentDetails(issueIdOrKey, commentId);
    },
    enabled: !!issueIdOrKey && !!commentId,
  });
};
