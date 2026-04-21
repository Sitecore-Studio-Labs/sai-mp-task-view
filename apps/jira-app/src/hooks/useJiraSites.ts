import type { JiraSitesSnapshot } from "@sai-mp-jira-task-view/jira-providers";
import { useQuery } from "@tanstack/react-query";

import { jiraExtension } from "@/lib/jira-extension";

import { JIRA_SITES_QUERY_KEY } from "./useJiraConnectionStatus";

export function useJiraSites() {
  return useQuery({
    queryKey: JIRA_SITES_QUERY_KEY,
    queryFn: async (): Promise<JiraSitesSnapshot> => {
      return jiraExtension.getJiraSites();
    },
  });
}
