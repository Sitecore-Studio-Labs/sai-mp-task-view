import { useMutation, useQueryClient } from "@tanstack/react-query";

import { JIRA_PROJECTS_QUERY_KEY } from "@/hooks/useJiraConnectionStatus";
import { apiClient } from "@/lib/axiosClient";

export function useJiraSelectProject() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (payload: { projectKey: string }) => {
      const res = await apiClient.post("/jira/select-project", payload);
      return res.data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: JIRA_PROJECTS_QUERY_KEY });
    },
  });
}
