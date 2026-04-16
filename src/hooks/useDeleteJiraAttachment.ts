import { useMutation } from "@tanstack/react-query";

import { apiClient } from "@/lib/axiosClient";

export function useDeleteJiraAttachment() {
  return useMutation({
    mutationFn: async (attachmentId: string): Promise<void> => {
      await apiClient.delete(`/jira/attachment/${attachmentId}`);
    },
  });
}
