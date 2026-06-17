"use client";

import { mdiFilePdfBox, mdiTrashCanOutline } from "@mdi/js";
import Image from "next/image";

import { usePlatformAttachmentUrl } from "../../../hooks/usePlatformAttachments";
import { Button } from "../../ui/button";
import { Icon } from "../../ui/icon";

export type TaskAttachmentItem = { id: string; filename: string };

type TaskAttachmentListProps = {
  attachments: TaskAttachmentItem[];
  onDelete?: (id: string) => void;
  deletePending?: boolean;
  bordered?: boolean;
};

function isImageFilename(filename: string): boolean {
  return /\.(png|jpe?g|gif|webp|bmp|svg)$/i.test(filename);
}

function isPdfFilename(filename: string): boolean {
  return filename.toLowerCase().endsWith(".pdf");
}

export function TaskAttachmentList({
  attachments,
  onDelete,
  deletePending,
  bordered = true,
}: TaskAttachmentListProps) {
  const attachmentUrl = usePlatformAttachmentUrl();

  if (attachments.length === 0) return null;

  const rows = attachments.map((attachment) => {
    const url = attachmentUrl(attachment.id);
    if (!url) return null;

    const isImg = isImageFilename(attachment.filename);
    const isPdf = isPdfFilename(attachment.filename);

    return (
      <div
        key={attachment.id}
        className="flex items-center gap-3 rounded-md border border-(--color-blackAlpha-200) p-2"
      >
        {isImg ? (
          <a href={url} target="_blank" rel="noreferrer" className="shrink-0">
            <Image
              src={url}
              alt={attachment.filename}
              width={40}
              height={40}
              className="h-10 w-10 rounded border border-(--color-blackAlpha-200) object-cover"
              unoptimized
            />
          </a>
        ) : isPdf ? (
          <span className="shrink-0">
            <Icon path={mdiFilePdfBox} size="md" colorScheme="danger" variant="subtle" />
          </span>
        ) : (
          <span className="bg-muted text-muted-foreground flex h-10 w-10 shrink-0 items-center justify-center rounded text-xs">
            FILE
          </span>
        )}
        <div className="min-w-0 flex-1">
          <a
            href={url}
            target="_blank"
            rel="noreferrer"
            className="text-primary block truncate text-sm font-medium hover:underline"
            title={attachment.filename}
          >
            {attachment.filename}
          </a>
          {isPdf && <div className="text-muted-foreground text-xs">PDF</div>}
        </div>
        {onDelete && (
          <Button
            type="button"
            variant="ghost"
            colorScheme="danger"
            size="sm"
            className="px-2"
            disabled={deletePending}
            onClick={(e) => {
              e.preventDefault();
              e.stopPropagation();
              onDelete(attachment.id);
            }}
            aria-label={`Delete attachment ${attachment.filename}`}
          >
            <Icon path={mdiTrashCanOutline} size="sm" colorScheme="danger" />
          </Button>
        )}
      </div>
    );
  });

  const content = <div className="grid grid-cols-1 gap-2">{rows}</div>;

  if (bordered) {
    return <div className="rounded-md border border-(--color-blackAlpha-300) p-3">{content}</div>;
  }

  return content;
}
