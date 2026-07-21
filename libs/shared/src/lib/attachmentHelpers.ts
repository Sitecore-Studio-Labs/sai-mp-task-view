/**
 * Maps file extensions to their canonical MIME types.
 * Used to override inaccurate Content-Types returned by upstream APIs/CDNs
 * (e.g. Wrike returns "text/plain" for SVG, "application/octet-stream" for WebP).
 */
const MIME_BY_EXT: Record<string, string> = {
  svg: "image/svg+xml",
  webp: "image/webp",
  bmp: "image/bmp",
  ico: "image/x-icon",
  tif: "image/tiff",
  tiff: "image/tiff",
  heic: "image/heic",
  jpg: "image/jpeg",
  jpeg: "image/jpeg",
  png: "image/png",
  gif: "image/gif",
  mp4: "video/mp4",
  mov: "video/quicktime",
  avi: "video/x-msvideo",
  mkv: "video/x-matroska",
  webm: "video/webm",
  mp3: "audio/mpeg",
  wav: "audio/wav",
  ogg: "audio/ogg",
  pdf: "application/pdf",
  doc: "application/msword",
  docx: "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
  xls: "application/vnd.ms-excel",
  xlsx: "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
  ppt: "application/vnd.ms-powerpoint",
  pptx: "application/vnd.openxmlformats-officedocument.presentationml.presentation",
  zip: "application/zip",
  txt: "text/plain; charset=utf-8",
};

/**
 * Returns the canonical MIME type for the given filename, falling back to the
 * upstream Content-Type when the extension is unknown.
 */
export function resolveContentType(filename: string | null, upstreamType: string): string {
  if (!filename) return upstreamType;
  const ext = filename.split(".").pop()?.toLowerCase() ?? "";
  return MIME_BY_EXT[ext] ?? upstreamType;
}

/**
 * Extensions the browser can render natively in a tab (images, PDF, audio, video).
 * Everything else is sent as an attachment to trigger a file download.
 */
const INLINE_EXTS = new Set([
  "jpg",
  "jpeg",
  "png",
  "gif",
  "webp",
  "bmp",
  "svg",
  "ico",
  "tif",
  "tiff",
  "heic",
  "heif",
  "pdf",
  "mp4",
  "mov",
  "avi",
  "mkv",
  "webm",
  "flv",
  "wmv",
  "m4v",
  "3gp",
  "mp3",
  "wav",
  "ogg",
  "flac",
  "aac",
  "m4a",
]);

/**
 * Builds a `Content-Disposition` header value.
 * Browser-renderable file types get `inline`; everything else gets `attachment`
 * so the browser downloads the file directly.
 */
export function resolveContentDisposition(filename: string | null): string {
  if (!filename) return "inline";
  const safe = filename.replace(/"/g, "");
  const ext = filename.split(".").pop()?.toLowerCase() ?? "";
  const disposition = INLINE_EXTS.has(ext) ? "inline" : "attachment";
  return `${disposition}; filename="${safe}"`;
}
