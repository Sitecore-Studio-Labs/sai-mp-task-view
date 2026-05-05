import { useMutation, useQueryClient } from "@tanstack/react-query";

import { SETUP_QUERY_KEY } from "@/hooks/useSetup";
import { apiClient } from "@/lib/axiosClient";
import type { SetupResponse } from "@/types/setup";

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
    onSuccess: async () => {
      // Stop any in-flight GET /setup from a prior invalidate (e.g. from upsert) from
      // overwriting the cache after we stamp `setup_completed_at`.
      await queryClient.cancelQueries({ queryKey: SETUP_QUERY_KEY });
      queryClient.setQueryData<SetupResponse>(SETUP_QUERY_KEY, (old) => {
        if (!old?.setup) return old;
        return {
          ...old,
          setup: {
            ...old.setup,
            setup_completed_at: new Date().toISOString(),
          },
        };
      });
      await queryClient.invalidateQueries({ queryKey: SETUP_QUERY_KEY });
    },
  });
}
