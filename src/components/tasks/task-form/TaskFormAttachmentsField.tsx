"use client";

import { format } from "date-fns";
import { mdiCloudUpload, mdiClose, mdiFileDocumentOutline } from "@mdi/js";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";
import { Icon } from "@/components/ui/icon";
import { cn } from "@/lib/utils";
import { validateAttachmentFile, isImageFile } from "./create-task-utils";

export type AttachmentItem = { id: string; file: File; addedAt: Date; objectUrl?: string };

const ACCEPT_ATTR = [
  "image/*",
  ".pdf",
  ".doc", ".docx",
  ".xls", ".xlsx",
  ".ppt", ".pptx",
  ".txt", ".csv", ".md", ".rtf",
  ".zip", ".rar", ".7z",
  ".json", ".xml", ".yaml", ".yml",
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
  return (
    <div className="space-y-2">
      <Label>Attachment</Label>
      <div
        className={cn(
          "flex flex-col items-center justify-center gap-2 rounded-md border border-dashed border-(--color-blackAlpha-300) bg-muted/20 px-4 py-6 transition-colors",
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
        <Icon path={mdiCloudUpload} size="lg" className="text-muted-foreground" />
        <span className="text-sm text-muted-foreground">
          Drop files to attach or{" "}
          <button
            type="button"
            onClick={() => attachmentInputRef.current?.click()}
            className="font-medium text-foreground underline hover:no-underline"
          >
            Browse
          </button>
        </span>
      </div>
      <p className="text-xs text-muted-foreground">
        Max 50MB per file. Allowed: images, PDF, Office, text, zip. Executables and scripts are blocked.
      </p>
      <input
        ref={attachmentInputRef}
        type="file"
        multiple
        className="hidden"
        accept={ACCEPT_ATTR}
        onChange={(e) => {
          onAddFiles(e.target.files);
          e.target.value = "";
        }}
      />
      {attachmentError && (
        <p className="text-sm text-destructive">{attachmentError}</p>
      )}
      {attachmentFiles.length > 0 && (
        <ul className="space-y-2">
          {attachmentFiles.map((item) => (
            <li
              key={item.id}
              className="flex items-center gap-3 rounded-md border border-(--color-blackAlpha-300) bg-muted/20 p-2"
            >
              <div className="flex size-12 shrink-0 items-center justify-center rounded border border-(--color-blackAlpha-300) bg-background">
                {item.objectUrl ? (
                  // eslint-disable-next-line @next/next/no-img-element -- blob preview for attachment
                  <img
                    src={item.objectUrl}
                    alt=""
                    className="size-full rounded object-cover"
                  />
                ) : (
                  <Icon
                    path={mdiFileDocumentOutline}
                    size="default"
                    className="text-muted-foreground"
                  />
                )}
              </div>
              <div className="min-w-0 flex-1">
                <p className="truncate text-sm font-medium text-foreground">
                  {item.file.name}
                </p>
                <p className="text-xs text-muted-foreground">
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
                <Icon path={mdiClose} size="sm" />
              </Button>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}

export { validateAttachmentFile, isImageFile };
