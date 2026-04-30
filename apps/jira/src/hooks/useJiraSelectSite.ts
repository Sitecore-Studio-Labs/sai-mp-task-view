import { extractApiError } from "@mp/shared";
import { useMutation, useQueryClient } from "@tanstack/react-query";

import { JIRA_PROJECTS_QUERY_KEY, JIRA_SITES_QUERY_KEY } from "@/hooks/useJiraConnectionStatus";
import { apiClient } from "@/lib/axiosClient";

export function useJiraSelectSite() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (payload: { cloudId: string }) => {
      try {
        const res = await apiClient.post("/jira/select-site", payload);
        return res.data;
      } catch (err) {
        throw new Error(extractApiError(err));
      }
    },
    onMutate: async (payload: { cloudId: string }) => {
      await queryClient.cancelQueries({ queryKey: JIRA_SITES_QUERY_KEY });

      const previousData = queryClient.getQueryData(JIRA_SITES_QUERY_KEY);

      queryClient.setQueryData(JIRA_SITES_QUERY_KEY, (old: { selectedSiteId?: string }) => {
        if (!old) return old;
        return { ...old, selectedSiteId: payload.cloudId };
      });

      return { previousData };
    },
    onError: (_err, _variables, context) => {
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
