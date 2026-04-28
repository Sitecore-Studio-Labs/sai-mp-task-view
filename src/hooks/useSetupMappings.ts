import { useQuery } from "@tanstack/react-query";

import { apiClient } from "@/lib/axiosClient";
import type { JiraSiteProjectMapping } from "@/types/setup";

export const SETUP_MAPPINGS_QUERY_KEY = ["setup", "mappings"] as const;

/**
 * Returns all SAI site → Jira project mappings for the current user.
 * A site with no mapping row uses the default project from jira_user_setup.
 */
export function useSetupMappings() {
  return useQuery({
    queryKey: SETUP_MAPPINGS_QUERY_KEY,
    queryFn: async (): Promise<JiraSiteProjectMapping[]> => {
      const res = await apiClient.get<JiraSiteProjectMapping[]>("/setup/mappings");
      return res.data;
    },
  });
}
