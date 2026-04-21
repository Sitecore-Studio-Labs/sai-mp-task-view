import { useQuery } from "@tanstack/react-query";

import { jiraExtension } from "@/lib/jira-extension";
import type { JiraUser } from "@/types/jira";

const JIRA_CURRENT_USER_QUERY_KEY = ["jira", "currentUser"] as const;

export function useJiraCurrentUser() {
  return useQuery({
    queryKey: JIRA_CURRENT_USER_QUERY_KEY,
    queryFn: async (): Promise<JiraUser> => {
      return jiraExtension.getCurrentUser();
    },
  });
}
