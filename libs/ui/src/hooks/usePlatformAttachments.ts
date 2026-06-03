"use client";

import { usePlatformApiPaths } from "@mp/task-core";
import { useMutation } from "@tanstack/react-query";

export function usePlatformDeleteAttachment() {
  const { client, paths } = usePlatformApiPaths();
  return useMutation({
    mutationFn: async (attachmentId: string): Promise<void> => {
      if (!paths.attachment) throw new Error("Attachments not supported");
      await client.delete(paths.attachment(attachmentId));
    },
  });
}

export function usePlatformOpenAttachment() {
  const { client, paths } = usePlatformApiPaths();
  return useMutation({
    mutationFn: async (attachmentId: string): Promise<void> => {
      if (!paths.attachment) throw new Error("Attachments not supported");
      const res = await client.get<ArrayBuffer>(paths.attachment(attachmentId), {
        responseType: "arraybuffer",
      });
      const contentType =
        (res.headers as Record<string, string>)["content-type"] ?? "application/octet-stream";
      const blob = new Blob([res.data], { type: contentType });
      const url = URL.createObjectURL(blob);
      window.open(url, "_blank");
      setTimeout(() => URL.revokeObjectURL(url), 60_000);
    },
  });
}
