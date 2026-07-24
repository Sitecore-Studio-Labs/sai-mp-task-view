import { useQuery, useQueryClient } from "@tanstack/react-query";

import { SETUP_QUERY_KEY } from "@/hooks/useSetup";
import { SETUP_MAPPINGS_QUERY_KEY } from "@/hooks/useSetupMappings";
import { apiClient } from "@/lib/axiosClient";

export const JIRA_STATUS_QUERY_KEY = ["platform", "connectionStatus"] as const;
export const JIRA_PROJECTS_QUERY_KEY = ["platform", "projects"] as const;
export const JIRA_SITES_QUERY_KEY = ["platform", "sites"] as const;

export function useJiraConnectionStatus() {
  return useQuery({
    queryKey: JIRA_STATUS_QUERY_KEY,
    queryFn: async (): Promise<{ connected: boolean }> => {
      const res = await apiClient.get<{ connected: boolean }>("/auth/jira/status");
      return res.data;
    },
  });
}

/**
 * Returns a disconnect function.
 * @param wipe When true, also deletes all setup config and site-project mappings.
 *             Defaults to false — settings are retained so they restore on reconnect.
 */
export function useDisconnectJira() {
  const queryClient = useQueryClient();

  return async (wipe = false) => {
    await apiClient.post("/auth/jira/disconnect", { wipe });
    // Flip UI immediately so connected-only sections hide before status refetch.
    queryClient.setQueryData(JIRA_STATUS_QUERY_KEY, { connected: false });
    void queryClient.invalidateQueries({ queryKey: JIRA_STATUS_QUERY_KEY });
    void queryClient.invalidateQueries({ queryKey: JIRA_PROJECTS_QUERY_KEY });
    void queryClient.invalidateQueries({ queryKey: JIRA_SITES_QUERY_KEY });
    void queryClient.invalidateQueries({ queryKey: ["platform", "issues"] });
    if (wipe) {
      queryClient.removeQueries({ queryKey: SETUP_QUERY_KEY });
      queryClient.removeQueries({ queryKey: SETUP_MAPPINGS_QUERY_KEY });
    } else {
      void queryClient.invalidateQueries({ queryKey: SETUP_QUERY_KEY });
      void queryClient.invalidateQueries({ queryKey: SETUP_MAPPINGS_QUERY_KEY });
    }
  };
}
