/**
 * Shared constants and pure helpers for the create-task form.
 */

import {
  mdiBookOpen,
  mdiBug,
  mdiCheckboxMarkedOutline,
  mdiFormatListChecks,
  mdiStar,
} from "@mdi/js";

export const MAX_ATTACHMENT_SIZE_BYTES = 50 * 1024 * 1024; // 50MB

export const ALLOWED_EXTENSIONS = new Set(
  [
    "jpg",
    "jpeg",
    "png",
    "gif",
    "webp",
    "svg",
    "bmp",
    "ico",
    "mp4",
    "mov",
    "webm",
    "mkv",
    "avi",
    "m4v",
    "pdf",
    "doc",
    "docx",
    "xls",
    "xlsx",
    "ppt",
    "pptx",
    "txt",
    "csv",
    "rtf",
    "md",
    "zip",
    "rar",
    "7z",
    "json",
    "xml",
    "yaml",
    "yml",
  ].map((e) => e.toLowerCase()),
);

export const BLOCKED_EXTENSIONS = new Set(
  ["exe", "bat", "cmd", "sh", "ps1", "vbs", "js", "jar", "msi", "dll", "scr"].map((e) =>
    e.toLowerCase(),
  ),
);

export function getFileExtension(name: string): string {
  const i = name.lastIndexOf(".");
  return i >= 0 ? name.slice(i + 1).toLowerCase() : "";
}

export function validateAttachmentFile(file: File): string | null {
  if (file.size > MAX_ATTACHMENT_SIZE_BYTES) {
    return `File "${file.name}" exceeds 50MB limit`;
  }
  const ext = getFileExtension(file.name);
  if (BLOCKED_EXTENSIONS.has(ext)) return `File type .${ext} is not allowed`;
  if (ext && !ALLOWED_EXTENSIONS.has(ext)) {
    return `File type .${ext} is not allowed. Allowed: images, video, PDF, Office, txt, csv, zip, etc.`;
  }
  return null;
}

export function isImageFile(file: File): boolean {
  return file.type.startsWith("image/");
}

/** Fallback icon path by issue type name (platform-agnostic). Used in task form and work breakdown preview. */
export function getIssueTypeIconPath(name: string): string {
  const n = name.toLowerCase();
  if (n.includes("bug")) return mdiBug;
  if (n.includes("epic")) return mdiStar;
  if (n.includes("story")) return mdiBookOpen;
  if (n.includes("subtask") || n.includes("sub-task")) return mdiCheckboxMarkedOutline;
  return mdiFormatListChecks; // task or default
}

/** Returns true if the issue type name represents a sub-task (Jira requires parent for these). */
export function isSubtaskIssueTypeName(name: string): boolean {
  const n = name.toLowerCase();
  return n.includes("subtask") || n === "sub-task";
}
