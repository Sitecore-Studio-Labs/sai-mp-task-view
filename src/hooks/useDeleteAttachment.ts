import { useMutation } from "@tanstack/react-query";

import { apiClient } from "@/lib/axiosClient";

export function useDeleteAttachment() {
  return useMutation({
    mutationFn: async (attachmentId: string): Promise<void> => {
      await apiClient.delete(`/platform/attachments/${attachmentId}`);
    },
  });
}
