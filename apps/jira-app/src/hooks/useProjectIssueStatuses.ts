import { useQuery } from "@tanstack/react-query";

import { jiraExtension } from "@/lib/jira-extension";
import { JiraProjectStatuses } from "@/types/jira";

export function useProjectIssueStatuses(projectKey?: string) {
  return useQuery({
    queryKey: ["project-statuses", projectKey],
    queryFn: async (): Promise<JiraProjectStatuses[]> => {
      if (!projectKey) return [];
      return jiraExtension.getProjectIssueStatuses(projectKey);
    },
    enabled: !!projectKey,
  });
}
