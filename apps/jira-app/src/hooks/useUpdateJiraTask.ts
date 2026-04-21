import { useMutation } from "@tanstack/react-query";

import type { UpdateTaskPayload } from "@/contexts/EditTaskContext";
import { jiraExtension } from "@/lib/jira-extension";
import type { UpdateJiraTaskPayload } from "@/types/jira";

export function useUpdateJiraTask(issueIdOrKey: string) {
  return useMutation({
    mutationFn: async (payload: UpdateTaskPayload): Promise<void> => {
      const body: UpdateJiraTaskPayload = {
        ...payload,
        description: payload.description === null ? undefined : payload.description,
      };
      await jiraExtension.updateIssue(issueIdOrKey, body);
    },
  });
}
