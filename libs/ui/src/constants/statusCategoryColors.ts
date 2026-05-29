import type { PlatformStatus } from "@mp/task-core";
import type { VariantProps } from "class-variance-authority";

import type { badgeVariants } from "../components/ui/badge";

export type StatusBadgeColorScheme = NonNullable<VariantProps<typeof badgeVariants>["colorScheme"]>;

/**
 * Canonical status-category → badge colors (pre-release / Jira-aligned).
 * Platforms should normalize statusCategory.key to one of these keys in adapters.
 */
export const STATUS_CATEGORY_COLOR_MAP: Record<string, StatusBadgeColorScheme> = {
  new: "neutral",
  indeterminate: "primary",
  done: "success",
  /** Wrike Cancelled/Deferred and similar */
  undefined: "danger",
};

/**
 * Optional fallback when platforms expose Atlassian-style colorName on statusCategory.
 * @see https://developer.atlassian.com/cloud/jira/platform/apis/rest/v3/#status-category
 */
const STATUS_COLOR_NAME_MAP: Record<string, StatusBadgeColorScheme> = {
  "blue-gray": "neutral",
  yellow: "primary",
  green: "success",
};

export function resolveStatusBadgeColorScheme(status?: PlatformStatus): StatusBadgeColorScheme {
  if (!status?.statusCategory) return "neutral";

  const { key, colorName } = status.statusCategory;
  if (key && STATUS_CATEGORY_COLOR_MAP[key]) {
    return STATUS_CATEGORY_COLOR_MAP[key];
  }
  if (colorName && STATUS_COLOR_NAME_MAP[colorName]) {
    return STATUS_COLOR_NAME_MAP[colorName];
  }
  return "neutral";
}
