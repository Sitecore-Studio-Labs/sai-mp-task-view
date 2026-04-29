import { useMutation, useQueryClient } from "@tanstack/react-query";

import { SETUP_QUERY_KEY } from "@/hooks/useSetup";
import { apiClient } from "@/lib/axiosClient";

/**
 * Marks the Setup Wizard as completed, unlocking the Task View.
 * Requires a setup record to already exist (call useUpsertSetup first).
 */
export function useCompleteSetup() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (): Promise<{ success: boolean }> => {
      const res = await apiClient.post<{ success: boolean }>("/setup/complete");
      return res.data;
    },
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: SETUP_QUERY_KEY });
    },
  });
}
