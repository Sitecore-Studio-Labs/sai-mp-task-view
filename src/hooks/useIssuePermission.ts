import { useQuery } from "@tanstack/react-query";

import { apiClient } from "@/lib/axiosClient";
import { JiraPermission } from "@/types/jira";

export interface IssuePermissionResponse {
  hasPermission: boolean;
}

export const usePermission = ({
  issueIdOrKey,
  projectKey,
  permission,
}: {
  issueIdOrKey?: string | null;
  projectKey?: string | null;
  permission: JiraPermission | null;
}) => {
  return useQuery<IssuePermissionResponse>({
    queryKey: ["jira", "permission", issueIdOrKey, projectKey, permission],
    enabled: !!permission && (!!issueIdOrKey || !!projectKey),

    queryFn: async () => {
      const res = await apiClient.get("/jira/permissions", {
        params: { issueIdOrKey, projectKey, permission },
      });

      return res.data;
    },
  });
};
