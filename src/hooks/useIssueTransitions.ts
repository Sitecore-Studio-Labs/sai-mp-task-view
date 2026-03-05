import { apiClient } from "@/lib/axiosClient";
import { useQuery } from "@tanstack/react-query";

export const useIssueTransitions = (issueIdOrKey: string) => {
  return useQuery({
    queryKey: ["jira-transitions", issueIdOrKey],
    queryFn: async () => {
      const response = await apiClient.get(
        `/jira/issues/${issueIdOrKey}/transitions`,
      );
      return response.data.transitions;
    },
  });
};
