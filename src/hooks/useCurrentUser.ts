import { useQuery } from "@tanstack/react-query";

import { apiClient } from "@/lib/axiosClient";
import type { PlatformUser } from "@/types/platform-entities";

export const PLATFORM_CURRENT_USER_QUERY_KEY = ["platform", "currentUser"] as const;

export function useCurrentUser() {
  return useQuery({
    queryKey: PLATFORM_CURRENT_USER_QUERY_KEY,
    queryFn: async (): Promise<PlatformUser> => {
      const res = await apiClient.get<PlatformUser>("/platform/current-user");
      return res.data;
    },
  });
}
