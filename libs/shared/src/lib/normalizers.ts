/**
 * Shared normalizer utilities for mapping raw platform API responses to
 * @mp/task-core types. Use these in platform service adapters to avoid
 * re-implementing the same logic differently per platform.
 */

/**
 * Converts a raw date value to an ISO 8601 string, or null if the value is
 * absent, empty, or not parseable as a date.
 *
 * Handles strings (ISO, "YYYY-MM-DD", Unix epoch ms), Date objects, and
 * Unix epoch numbers. Returns null for null, undefined, and empty strings.
 */
export function toISODateString(value: string | number | Date | null | undefined): string | null {
  if (value == null || value === "") return null;
  if (value instanceof Date) {
    return isNaN(value.getTime()) ? null : value.toISOString();
  }
  if (typeof value === "number") {
    const d = new Date(value);
    return isNaN(d.getTime()) ? null : d.toISOString();
  }
  // string path
  const d = new Date(value);
  return isNaN(d.getTime()) ? null : d.toISOString();
}

/**
 * Maps a raw priority value (string or { name: string } object) to a
 * normalised label using a caller-supplied lookup map.
 *
 * Returns null when the priority is absent or not found in the map.
 *
 * Example usage:
 *   const WRIKE_PRIORITY_MAP: Record<string, string> = {
 *     High: "High", Normal: "Medium", Low: "Low",
 *   };
 *   mapPriority(task.importance, WRIKE_PRIORITY_MAP)
 */
export function mapPriority(
  raw: string | { name?: string } | null | undefined,
  mapping: Record<string, string>,
): string | null {
  if (raw == null) return null;
  const key = typeof raw === "string" ? raw : (raw.name ?? "");
  return mapping[key] ?? null;
}

/**
 * Extracts a normalised assignee display name and id from a raw user object.
 * Returns null when the assignee is absent.
 *
 * Checks common platform field names:
 *   - id / accountId / userId
 *   - displayName / name / fullName
 *
 * Use this as a starting point — extend or replace if the platform's user
 * shape differs significantly (e.g. Monday returns `{ id, name }` while
 * Wrike returns `{ id, firstName, lastName }`).
 */
export function mapAssignee(
  raw: Record<string, unknown> | null | undefined,
): { id: string; displayName: string; avatarUrl?: string } | null {
  if (raw == null) return null;

  const id =
    (raw["accountId"] as string | undefined) ??
    (raw["userId"] as string | undefined) ??
    (raw["id"] as string | undefined);

  const displayName =
    (raw["displayName"] as string | undefined) ??
    (raw["name"] as string | undefined) ??
    (raw["fullName"] as string | undefined);

  if (!id || !displayName) return null;

  const avatarUrl = (raw["avatarUrl"] as string | undefined) ?? undefined;
  return { id, displayName, ...(avatarUrl !== undefined ? { avatarUrl } : {}) };
}

/**
 * Strips HTML tags from a string, returning plain text.
 * Collapses multiple whitespace characters into a single space and trims
 * leading/trailing whitespace.
 *
 * Intended for platforms that return HTML in description/comment fields
 * (e.g. Wrike). For platforms using ADF or Markdown, use the respective
 * parser instead.
 */
export function stripHtml(html: string | null | undefined): string {
  if (!html) return "";
  return html
    .replace(/<[^>]+>/g, " ")
    .replace(/&nbsp;/gi, " ")
    .replace(/&amp;/gi, "&")
    .replace(/&lt;/gi, "<")
    .replace(/&gt;/gi, ">")
    .replace(/&quot;/gi, '"')
    .replace(/&#39;/gi, "'")
    .replace(/\s+/g, " ")
    .trim();
}
