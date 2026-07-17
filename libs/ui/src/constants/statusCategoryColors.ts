import type { PlatformStatus } from "@mp/task-core";
import type { VariantProps } from "class-variance-authority";

import type { badgeVariants } from "../components/ui/badge";

export type StatusBadgeColorScheme = NonNullable<VariantProps<typeof badgeVariants>["colorScheme"]>;

/**
 * Canonical status-category → badge colors (pre-release / Jira-aligned).
 * Platforms should normalize statusCategory.key to one of these keys in adapters.
 *
 * Resolution order in resolveStatusBadgeColorScheme:
 * 1. statusCategory.colorName (e.g. Wrike workflow palette) — preferred when set
 * 2. statusCategory.key semantic fallback (new / indeterminate / done / undefined)
 */
export const STATUS_CATEGORY_COLOR_MAP: Record<string, StatusBadgeColorScheme> = {
  new: "neutral",
  indeterminate: "primary",
  done: "success",
  /** Wrike Cancelled and unmapped categories */
  undefined: "danger",
};

/**
 * Optional fallback when platforms expose Atlassian-style colorName on statusCategory.
 * @see https://developer.atlassian.com/cloud/jira/platform/apis/rest/v3/#status-category
 */
const STATUS_COLOR_NAME_MAP: Record<string, StatusBadgeColorScheme> = {
  gray: "neutral",
  primary: "primary",
  success: "success",
  green: "success",
  red: "danger",
  orange: "warning",
  purple: "primary",
  teal: "teal",
  cyan: "cyan",
  yellow: "yellow",
  pink: "pink",
  violet: "violet",
  indigo: "indigo",
  blue: "blue",
  sky: "sky",
  lime: "lime",
  stone: "stone",
};

export function resolveStatusBadgeColorScheme(status?: PlatformStatus): StatusBadgeColorScheme {
  if (!status?.statusCategory) return "neutral";

  const { key, colorName } = status.statusCategory;
  // Prefer platform-configured workflow color (e.g. Wrike custom status palette).
  if (colorName && STATUS_COLOR_NAME_MAP[colorName]) {
    return STATUS_COLOR_NAME_MAP[colorName];
  }
  if (key && STATUS_CATEGORY_COLOR_MAP[key]) {
    return STATUS_CATEGORY_COLOR_MAP[key];
  }
  return "neutral";
}
