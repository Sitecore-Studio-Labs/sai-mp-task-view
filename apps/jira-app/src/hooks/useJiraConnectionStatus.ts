import { useQuery, useQueryClient } from "@tanstack/react-query";

import { jiraExtension } from "@/lib/jira-extension";

export const JIRA_STATUS_QUERY_KEY = ["jira", "connectionStatus"] as const;
export const JIRA_PROJECTS_QUERY_KEY = ["jira", "projects"] as const;
export const JIRA_SITES_QUERY_KEY = ["jira", "sites"] as const;

export function useJiraConnectionStatus() {
  return useQuery({
    queryKey: JIRA_STATUS_QUERY_KEY,
    queryFn: async (): Promise<{ connected: boolean }> => {
      return jiraExtension.getConnectionStatus();
    },
  });
}

export function useDisconnectJira() {
  const queryClient = useQueryClient();

  return async () => {
    await jiraExtension.disconnectJira();
    queryClient.invalidateQueries({ queryKey: JIRA_STATUS_QUERY_KEY });
    queryClient.invalidateQueries({ queryKey: JIRA_PROJECTS_QUERY_KEY });
    queryClient.invalidateQueries({ queryKey: JIRA_SITES_QUERY_KEY });
  };
}
