import { useQuery } from "@tanstack/react-query";

import { apiClient } from "@/lib/axiosClient";
import type { SetupResponse } from "@/types/setup";

export const SETUP_QUERY_KEY = ["setup"] as const;

/**
 * Returns the current user's connection state, setup record, and site-project mappings.
 */
export function useSetup() {
  return useQuery({
    queryKey: SETUP_QUERY_KEY,
    queryFn: async (): Promise<SetupResponse> => {
      const res = await apiClient.get<SetupResponse>("/setup");
      return res.data;
    },
  });
}
