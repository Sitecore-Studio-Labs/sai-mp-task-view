import { useMutation, useQueryClient } from "@tanstack/react-query";

import { JIRA_PROJECTS_QUERY_KEY, JIRA_SITES_QUERY_KEY } from "@/hooks/useJiraConnectionStatus";
import { jiraExtension } from "@/lib/jira-extension";

export function useJiraSelectSite() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (payload: { cloudId: string }) => {
      return jiraExtension.selectJiraSite(payload);
    },
    onMutate: async (payload: { cloudId: string }) => {
      // Cancel any outgoing queries for projects so they don't overwrite optimistic update
      await queryClient.cancelQueries({ queryKey: JIRA_SITES_QUERY_KEY });

      // Get the previous data for rollback
      const previousData = queryClient.getQueryData(JIRA_SITES_QUERY_KEY);

      // Perform optimistic update - assume site selection succeeds
      queryClient.setQueryData(JIRA_SITES_QUERY_KEY, (old: { selectedSiteId?: string }) => {
        if (!old) return old;
        return {
          ...old,
          selectedSiteId: payload.cloudId,
        };
      });

      // Return context for rollback in onError
      return { previousData };
    },
    onError: (err, variables, context) => {
      // Rollback to previous data if mutation fails
      if (context?.previousData !== undefined) {
        queryClient.setQueryData(JIRA_SITES_QUERY_KEY, context.previousData);
      }
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: JIRA_SITES_QUERY_KEY });
      queryClient.invalidateQueries({ queryKey: JIRA_PROJECTS_QUERY_KEY });
    },
  });
}
