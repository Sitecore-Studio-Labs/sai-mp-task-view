import { useMutation } from "@tanstack/react-query";

import { apiClient } from "@/lib/axiosClient";

interface OpenAttachmentPayload {
  attachmentId: string;
}

export const useOpenJiraAttachment = () => {
  return useMutation({
    mutationFn: async ({ attachmentId }: OpenAttachmentPayload) => {
      const response = await apiClient.get(`/api/jira/attachment/${attachmentId}`, {
        responseType: "blob",
      });

      return response.data;
    },
    onSuccess: (blob) => {
      const url = window.URL.createObjectURL(blob);
      window.open(url, "_blank");
    },
  });
};
