import { useMutation, useQueryClient } from "@tanstack/react-query";

import { SETUP_QUERY_KEY } from "@/hooks/useSetup";
import { SETUP_MAPPINGS_QUERY_KEY } from "@/hooks/useSetupMappings";
import { apiClient } from "@/lib/axiosClient";
import type { JiraSiteProjectMapping, UpsertMappingsPayload } from "@/types/setup";

/**
 * Replaces all SAI site → Jira project mappings for the current user.
 * Pass an empty mappings array to clear all overrides (Task View falls back to default project).
 */
export function useUpsertSetupMappings() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (payload: UpsertMappingsPayload): Promise<JiraSiteProjectMapping[]> => {
      const res = await apiClient.put<JiraSiteProjectMapping[]>("/setup/mappings", payload);
      return res.data;
    },
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: SETUP_MAPPINGS_QUERY_KEY });
      void queryClient.invalidateQueries({ queryKey: SETUP_QUERY_KEY });
    },
  });
}
