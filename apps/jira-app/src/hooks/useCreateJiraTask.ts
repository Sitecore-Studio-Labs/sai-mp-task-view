import { useMutation, useQueryClient } from "@tanstack/react-query";
import axios from "axios";

import { JIRA_PROJECTS_QUERY_KEY } from "@/hooks/useJiraConnectionStatus";
import { JIRA_PRIORITIES_QUERY_KEY } from "@/hooks/useJiraPriorities";
import { apiClient } from "@/lib/axiosClient";
import type { CreateJiraTaskPayload, JiraTask } from "@/types/jira";

export function useCreateJiraTask() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (payload: CreateJiraTaskPayload): Promise<JiraTask> => {
      try {
        const res = await apiClient.post<JiraTask>("/jira/issues", payload);
        return res.data;
      } catch (err) {
        if (
          axios.isAxiosError(err) &&
          err.response?.data &&
          typeof err.response.data === "object" &&
          "error" in err.response.data &&
          typeof (err.response.data as { error: unknown }).error === "string"
        ) {
          throw new Error((err.response.data as { error: string }).error);
        }
        throw err;
      }
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
