"use client";

import { usePlatformApiPaths } from "@mp/task-core";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { useCallback } from "react";
import { toast } from "sonner";

export function usePlatformAttachmentUrl() {
  const { client, paths } = usePlatformApiPaths();
  return useCallback(
    (attachmentId: string, filename?: string): string => {
      if (!paths.attachment) return "";
      const base = (client.defaults.baseURL ?? "").replace(/\/$/, "");
      const url = `${base}${paths.attachment(attachmentId)}`;
      if (!filename) return url;
      return `${url}?filename=${encodeURIComponent(filename)}`;
    },
    [client, paths],
  );
}

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

/**
 * Uploads files to a task via the platform BFF (`paths.uploadAttachments`).
 * Used by create/edit task flows after the task is saved.
 */
export function usePlatformUploadAttachments() {
  const { client, paths } = usePlatformApiPaths();
  const queryClient = useQueryClient();

  return useCallback(
    async (
      taskKey: string,
      files: File[],
      verb: "created" | "updated" = "created",
    ): Promise<void> => {
      if (!paths.uploadAttachments || files.length === 0) return;

      for (const file of files) {
        const attempt = async (): Promise<void> => {
          const formData = new FormData();
          formData.append("file", file);
          try {
            await client.post(paths.uploadAttachments!(taskKey), formData, { timeout: 95_000 });
          } catch (err: unknown) {
            const e = err as { response?: { data?: { error?: string } }; message?: string };
            const msg = e?.response?.data?.error ?? e?.message ?? "Upload failed.";
            toast.error(
              `Task ${taskKey} was ${verb}, but attaching "${file.name}" failed. ${msg}`,
              {
                action: { label: "Retry", onClick: () => void attempt() },
              },
            );
          }
        };
        await attempt();
      }

      await queryClient.invalidateQueries({ queryKey: ["platform", "issue", taskKey] });
      await queryClient.invalidateQueries({ queryKey: ["platform", "issues"] });
    },
    [client, paths, queryClient],
  );
}
