import { useQuery } from "@tanstack/react-query";

import { apiClient } from "@/lib/axiosClient";

export interface DeletePermissionResponse {
  canDelete: boolean;
}

export const useIssueDeletePermission = (issueIdOrKey: string | null) => {
  return useQuery<DeletePermissionResponse>({
    queryKey: ["jira", "issueDeletePermission", issueIdOrKey],
    enabled: !!issueIdOrKey,

    queryFn: async () => {
      const res = await apiClient.get("/jira/permissions", {
        params: { issueIdOrKey },
      });

      return res.data;
    },
  });
};
