import { useMutation } from "@tanstack/react-query";

import { jiraExtension } from "@/lib/jira-extension";

interface OpenAttachmentPayload {
  attachmentId: string;
}

export const useOpenJiraAttachment = () => {
  return useMutation({
    mutationFn: async ({ attachmentId }: OpenAttachmentPayload) => {
      return jiraExtension.getAttachmentBlob(attachmentId);
    },
    onSuccess: (blob) => {
      const url = window.URL.createObjectURL(blob);
      window.open(url, "_blank");
    },
  });
};
