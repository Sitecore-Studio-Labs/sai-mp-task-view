import { useQuery } from "@tanstack/react-query";

import { apiClient } from "@/lib/axiosClient";

export const useIssueComments = (issueIdOrKey: string | null) => {
  return useQuery({
    queryKey: ["jira", "issueComments", issueIdOrKey],
    enabled: !!issueIdOrKey,

    queryFn: async () => {
      const res = await apiClient.get("/jira/comments", {
        params: { issueIdOrKey },
      });

      return res.data;
    },
  });
};
