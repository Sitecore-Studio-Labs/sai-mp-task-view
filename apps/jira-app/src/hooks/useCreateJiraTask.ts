import { useMutation, useQueryClient } from "@tanstack/react-query";

import { JIRA_PROJECTS_QUERY_KEY } from "@/hooks/useJiraConnectionStatus";
import { JIRA_PRIORITIES_QUERY_KEY } from "@/hooks/useJiraPriorities";
import { jiraExtension } from "@/lib/jira-extension";
import type { CreateJiraTaskPayload, JiraTask } from "@/types/jira";

export function useCreateJiraTask() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (payload: CreateJiraTaskPayload): Promise<JiraTask> => {
      return jiraExtension.createIssue(payload);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: JIRA_PROJECTS_QUERY_KEY });
      queryClient.invalidateQueries({ queryKey: JIRA_PRIORITIES_QUERY_KEY });
      queryClient.invalidateQueries({ queryKey: ["jira", "issue-types"] });
      queryClient.invalidateQueries({ queryKey: ["jira", "assignees"] });
      queryClient.invalidateQueries({ queryKey: ["jira", "boardIssues"] });
    },
  });
}
