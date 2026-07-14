"use client";

import {
  mdiFileCodeOutline,
  mdiFileDocument,
  mdiFileExcelBox,
  mdiFileImage,
  mdiFileLinkOutline,
  mdiFileMusicOutline,
  mdiFilePdfBox,
  mdiFilePowerpoint,
  mdiFileVideo,
  mdiFileWordOutline,
  mdiTrashCanOutline,
  mdiZipBoxOutline,
} from "@mdi/js";
import { useState } from "react";

import { usePlatformAttachmentUrl } from "../../../hooks/usePlatformAttachments";
import { Button } from "../../ui/button";
import { Icon } from "../../ui/icon";

export type TaskAttachmentItem = {
  id: string;
  filename: string;
  mimeType?: string;
  content?: string;
  directUrl?: string;
};

type TaskAttachmentListProps = {
  attachments: TaskAttachmentItem[];
  onDelete?: (id: string) => void;
  deletePending?: boolean;
  bordered?: boolean;
};

type FileCategory =
  | "image"
  | "pdf"
  | "video"
  | "audio"
  | "word"
  | "excel"
  | "powerpoint"
  | "archive"
  | "code"
  | "link"
  | "generic";

function getFileCategory(filename: string, mimeType?: string): FileCategory {
  // Always use filename extension first — platform MIME types can be unreliable
  // (e.g. Wrike returns "text/plain" for SVG, "application/octet-stream" for WebP).
  const ext = filename.includes(".") ? (filename.split(".").pop()?.toLowerCase() ?? "") : "";
  const mime = mimeType?.toLowerCase() ?? "";

  if (/^(png|jpe?g|gif|webp|bmp|svg|ico|tiff?)$/.test(ext)) return "image";
  if (ext === "pdf") return "pdf";
  if (/^(mp4|mov|avi|mkv|webm|flv|wmv|m4v|3gp)$/.test(ext)) return "video";
  if (/^(mp3|wav|ogg|flac|aac|m4a|wma)$/.test(ext)) return "audio";
  if (/^(doc|docx)$/.test(ext)) return "word";
  if (/^(xls|xlsx|csv)$/.test(ext)) return "excel";
  if (/^(ppt|pptx)$/.test(ext)) return "powerpoint";
  if (/^(zip|tar|gz|7z|rar|bz2|xz)$/.test(ext)) return "archive";
  if (
    /^(js|ts|jsx|tsx|html|css|json|xml|yaml|yml|sh|py|rb|go|java|c|cpp|cs|php|rs|swift|kt)$/.test(
      ext,
    )
  )
    return "code";

  // No extension — fall back to MIME only for unambiguous types.
  if (!ext) {
    if (mime.startsWith("image/")) return "image";
    if (mime === "application/pdf") return "pdf";
    if (mime.startsWith("video/")) return "video";
    if (mime.startsWith("audio/")) return "audio";
    if (mime.includes("word") || mime.includes("wordprocessingml")) return "word";
    if (mime.includes("excel") || mime.includes("spreadsheetml")) return "excel";
    if (mime.includes("powerpoint") || mime.includes("presentationml")) return "powerpoint";
    if (mime.includes("zip") || mime.includes("archive")) return "archive";
    return "link";
  }

  return "generic";
}

const CATEGORY_ICON: Record<
  Exclude<FileCategory, "image">,
  { path: string; colorScheme: "danger" | "neutral" | "primary" | "success" | "warning" }
> = {
  pdf: { path: mdiFilePdfBox, colorScheme: "danger" },
  video: { path: mdiFileVideo, colorScheme: "primary" },
  audio: { path: mdiFileMusicOutline, colorScheme: "primary" },
  word: { path: mdiFileWordOutline, colorScheme: "primary" },
  excel: { path: mdiFileExcelBox, colorScheme: "success" },
  powerpoint: { path: mdiFilePowerpoint, colorScheme: "warning" },
  archive: { path: mdiZipBoxOutline, colorScheme: "neutral" },
  code: { path: mdiFileCodeOutline, colorScheme: "neutral" },
  link: { path: mdiFileLinkOutline, colorScheme: "primary" },
  generic: { path: mdiFileDocument, colorScheme: "neutral" },
};

function ImageThumbnail({ src, alt }: { src: string; alt: string }) {
  const [failed, setFailed] = useState(false);
  if (failed) {
    return <Icon path={mdiFileImage} size="md" colorScheme="primary" variant="subtle" />;
  }
  return (
    <img
      src={src}
      alt={alt}
      className="h-10 w-10 rounded border border-(--color-blackAlpha-200) object-cover"
      onError={() => setFailed(true)}
    />
  );
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
    const category = getFileCategory(attachment.filename, attachment.mimeType);

    // Always prefer the BFF proxy for thumbnails — it handles auth and MIME
    // correction for all platforms. Fall back to attachment.content only when
    // no BFF route is configured.
    const bffUrl = attachmentUrl(attachment.id, attachment.filename);
    const thumbnailUrl = bffUrl || attachment.content || "";

    // Use the pre-signed direct URL when available (e.g. Wrike CDN URLs) so
    // the browser downloads or previews the file natively without going through
    // the BFF proxy. This also fixes downloads inside iframes because the
    // browser receives the file directly from the CDN. Falls back to the BFF
    // proxy, then to attachment.content.
    const linkUrl =
      attachment.directUrl ||
      (category === "link" && attachment.content ? attachment.content : null) ||
      bffUrl ||
      attachment.content ||
      "";

    if (!thumbnailUrl && !linkUrl) return null;

    const isImage = category === "image";

    return (
      <div
        key={attachment.id}
        className="flex items-center gap-3 rounded-md border border-(--color-blackAlpha-200) p-2"
      >
        {isImage ? (
          <a href={linkUrl} target="_blank" rel="noreferrer" className="shrink-0">
            <ImageThumbnail src={thumbnailUrl ?? ""} alt={attachment.filename} />
          </a>
        ) : (
          <span className="shrink-0">
            <Icon
              path={CATEGORY_ICON[category].path}
              size="md"
              colorScheme={CATEGORY_ICON[category].colorScheme}
              variant="subtle"
            />
          </span>
        )}
        <div className="min-w-0 flex-1">
          <a
            href={linkUrl}
            target="_blank"
            rel="noopener noreferrer"
            className="text-primary block truncate text-sm font-medium hover:underline"
            title={attachment.filename}
          >
            {attachment.filename}
          </a>
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
