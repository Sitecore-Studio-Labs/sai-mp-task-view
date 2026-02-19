import { useQuery } from "@tanstack/react-query";
import type { JiraUser } from "@/types/jira";
import { apiClient } from "@/lib/axiosClient";

const JIRA_CURRENT_USER_QUERY_KEY = ["jira", "currentUser"] as const;

export function useJiraCurrentUser() {
  return useQuery({
    queryKey: JIRA_CURRENT_USER_QUERY_KEY,
    queryFn: async (): Promise<JiraUser> => {
      const res = await apiClient.get<JiraUser>("/jira/current-user");
      return res.data;
    },
  });
}
