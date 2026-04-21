import { useQuery } from "@tanstack/react-query";

import { jiraExtension } from "@/lib/jira-extension";
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
      if (!permission) {
        return { hasPermission: false };
      }
      return jiraExtension.getIssuePermission({ issueIdOrKey, projectKey, permission });
    },
  });
};
