"use client";

import { mdiClose, mdiCloudUpload, mdiFileDocumentOutline } from "@mdi/js";
import { cn } from "@mp/shared";
import { usePlatformCapabilities } from "@mp/task-core";
import { format } from "date-fns";

import { Button } from "../../ui/button";
import { Icon } from "../../ui/icon";
import { Label } from "../../ui/label";
import { isImageFile, validateAttachmentFile } from "./create-task-utils";

export type AttachmentItem = { id: string; file: File; addedAt: Date; objectUrl?: string };

const ACCEPT_ATTR = [
  "image/*",
  ".pdf",
  ".doc",
  ".docx",
  ".xls",
  ".xlsx",
  ".ppt",
  ".pptx",
  ".txt",
  ".csv",
  ".md",
  ".rtf",
  ".zip",
  ".rar",
  ".7z",
  ".json",
  ".xml",
  ".yaml",
  ".yml",
].join(",");

type TaskFormAttachmentsFieldProps = {
  attachmentFiles: AttachmentItem[];
  attachmentError: string | null;
  attachmentInputRef: React.RefObject<HTMLInputElement | null>;
  onAddFiles: (files: FileList | null) => void;
  onRemove: (id: string) => void;
};

export function TaskFormAttachmentsField({
  attachmentFiles,
  attachmentError,
  attachmentInputRef,
  onAddFiles,
  onRemove,
}: TaskFormAttachmentsFieldProps) {
  const { hasAttachments } = usePlatformCapabilities();

  if (!hasAttachments) return null;

  return (
    <div className="space-y-2" data-testid="task-attachments-field">
      <Label>Attachment</Label>
      <div
        className={cn(
          "bg-muted/20 flex flex-col items-center justify-center gap-2 rounded-md border border-dashed border-(--color-blackAlpha-300) px-4 py-6 transition-colors",
          "hover:bg-muted/30",
        )}
        onDragOver={(e) => {
          e.preventDefault();
          e.stopPropagation();
        }}
        onDrop={(e) => {
          e.preventDefault();
          e.stopPropagation();
          onAddFiles(e.dataTransfer.files);
        }}
      >
        <Icon
          path={mdiCloudUpload}
          size="lg"
          colorScheme="inherit"
          className="text-muted-foreground"
        />
        <span className="text-muted-foreground text-sm">
          Drop files to attach or{" "}
          <button
            type="button"
            onClick={() => attachmentInputRef.current?.click()}
            className="text-foreground font-medium underline hover:no-underline"
          >
            Browse
          </button>
        </span>
      </div>
      <p className="text-muted-foreground text-xs">
        Max 50MB per file. Allowed: images, PDF, Office, text, zip. Executables and scripts are
        blocked.
      </p>
      <input
        ref={attachmentInputRef}
        type="file"
        multiple
        className="hidden"
        accept={ACCEPT_ATTR}
        data-testid="task-attachments-input"
        onChange={(e) => {
          onAddFiles(e.target.files);
          e.target.value = "";
        }}
      />
      {attachmentError && <p className="text-destructive text-sm">{attachmentError}</p>}
      {attachmentFiles.length > 0 && (
        <ul className="space-y-2">
          {attachmentFiles.map((item) => (
            <li
              key={item.id}
              className="bg-muted/20 flex items-center gap-3 rounded-md border border-(--color-blackAlpha-300) p-2"
            >
              <div className="bg-background flex size-12 shrink-0 items-center justify-center rounded border border-(--color-blackAlpha-300)">
                {item.objectUrl ? (
                  <img src={item.objectUrl} alt="" className="size-full rounded object-cover" />
                ) : (
                  <Icon
                    path={mdiFileDocumentOutline}
                    size="default"
                    colorScheme="inherit"
                    className="text-neutral-fg"
                  />
                )}
              </div>
              <div className="min-w-0 flex-1">
                <p className="text-foreground truncate text-sm font-medium">{item.file.name}</p>
                <p className="text-muted-foreground text-xs">
                  {format(item.addedAt, "d MMM yyyy, h:mm a")}
                </p>
              </div>
              <Button
                type="button"
                variant="ghost"
                size="sm"
                colorScheme="neutral"
                className="size-8 shrink-0 p-0"
                onClick={() => onRemove(item.id)}
                aria-label="Remove attachment"
              >
                <Icon path={mdiClose} size="sm" colorScheme="inherit" className="text-neutral-fg" />
              </Button>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}

export { isImageFile, validateAttachmentFile };
