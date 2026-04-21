import { useMutation } from "@tanstack/react-query";

import { jiraExtension } from "@/lib/jira-extension";

export function useDeleteJiraAttachment() {
  return useMutation({
    mutationFn: async (attachmentId: string): Promise<void> => {
      await jiraExtension.deleteAttachment(attachmentId);
    },
  });
}
