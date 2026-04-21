import { useMutation, useQueryClient } from "@tanstack/react-query";

import { JIRA_PROJECTS_QUERY_KEY } from "@/hooks/useJiraConnectionStatus";
import { jiraExtension } from "@/lib/jira-extension";

export function useJiraSelectProject() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (payload: { projectKey: string }) => {
      return jiraExtension.selectJiraProject(payload);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: JIRA_PROJECTS_QUERY_KEY });
    },
  });
}
