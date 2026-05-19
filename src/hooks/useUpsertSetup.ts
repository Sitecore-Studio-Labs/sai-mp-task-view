import { useMutation, useQueryClient } from "@tanstack/react-query";

import { SETUP_QUERY_KEY } from "@/hooks/useSetup";
import { apiClient } from "@/lib/axiosClient";
import type { JiraUserSetup, SetupResponse, UpsertSetupPayload } from "@/types/setup";

/**
 * Creates or updates the Setup Wizard record (Jira instance + default project).
 * Does NOT complete the wizard — call useCompleteSetup after saving.
 */
export function useUpsertSetup() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (payload: UpsertSetupPayload): Promise<JiraUserSetup> => {
      const res = await apiClient.post<JiraUserSetup>("/setup", payload);
      return res.data;
    },
    onSuccess: (data) => {
      // Patch cache with the response instead of invalidating, so a late in-flight
      // GET from a previous invalidate can’t race with useCompleteSetup’s cache patch.
      queryClient.setQueryData<SetupResponse>(SETUP_QUERY_KEY, (old) => ({
        connected: true,
        setup: data,
        mappings: old?.mappings ?? [],
      }));
    },
  });
}
