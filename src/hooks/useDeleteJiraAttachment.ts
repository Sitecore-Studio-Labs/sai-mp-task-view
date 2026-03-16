import { apiClient } from "@/lib/axiosClient";
import { useMutation } from "@tanstack/react-query";

export function useDeleteJiraAttachment() {
  return useMutation({
    mutationFn: async (attachmentId: string): Promise<void> => {
      await apiClient.delete(`/jira/attachment/${attachmentId}`);
    },
  });
}

