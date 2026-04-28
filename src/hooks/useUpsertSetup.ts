import { useMutation, useQueryClient } from "@tanstack/react-query";

import { SETUP_QUERY_KEY } from "@/hooks/useSetup";
import { apiClient } from "@/lib/axiosClient";
import type { JiraUserSetup, UpsertSetupPayload } from "@/types/setup";

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
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: SETUP_QUERY_KEY });
    },
  });
}
