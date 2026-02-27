import { apiClient } from "@/lib/axiosClient";
import { useQuery } from "@tanstack/react-query";
import { JIRA_ISSUE_COMMENTS_QUERY_KEY } from "@/constants/queryKeys";

export const useIssueComments = (issueIdOrKey: string | null) => {
  return useQuery({
    queryKey: JIRA_ISSUE_COMMENTS_QUERY_KEY(issueIdOrKey),
    enabled: !!issueIdOrKey,

    queryFn: async () => {
      const res = await apiClient.get("/jira/comments", {
        params: { issueIdOrKey },
      });

      return res.data;
    },
  });
};