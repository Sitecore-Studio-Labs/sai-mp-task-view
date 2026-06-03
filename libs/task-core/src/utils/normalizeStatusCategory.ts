import type { PlatformStatusCategory } from "../types/display-types";

/**
 * Canonical status category keys used across the marketplace UI.
 * Aligns with Jira statusCategory keys; adapters for other platforms should map into these.
 */
export type CanonicalStatusCategoryKey = "new" | "indeterminate" | "done" | "undefined";

const WRIKE_STANDARD_NAME_MAP: Record<string, CanonicalStatusCategoryKey> = {
  Active: "indeterminate",
  Completed: "done",
  Cancelled: "undefined",
  Deferred: "undefined",
};

/**
 * Maps a platform-specific status category identifier to a canonical key for UI coloring and filters.
 * Prefer passing through native keys when already canonical (Jira).
 */
export function normalizeStatusCategoryKey(
  input: string | undefined,
  options?: { source?: "jira" | "wrike" | "generic" },
): CanonicalStatusCategoryKey {
  if (!input) return "new";

  const key = input.trim();
  const canonical: CanonicalStatusCategoryKey[] = ["new", "indeterminate", "done", "undefined"];
  if (canonical.includes(key as CanonicalStatusCategoryKey)) {
    return key as CanonicalStatusCategoryKey;
  }

  if (options?.source === "wrike" && WRIKE_STANDARD_NAME_MAP[key]) {
    return WRIKE_STANDARD_NAME_MAP[key];
  }

  // Heuristics for label-based platforms (Monday, Trello list names, etc.)
  const lower = key.toLowerCase();
  if (/done|complete|closed|resolved/.test(lower)) return "done";
  if (/progress|active|doing|review/.test(lower)) return "indeterminate";
  if (/cancel|block|hold|defer/.test(lower)) return "undefined";

  return "new";
}

export function buildPlatformStatusCategory(
  input: string | undefined,
  options?: { name?: string; colorName?: string; source?: "jira" | "wrike" | "generic" },
): PlatformStatusCategory {
  const key = normalizeStatusCategoryKey(input, options);
  return {
    key,
    name: options?.name,
    colorName: options?.colorName,
  };
}
