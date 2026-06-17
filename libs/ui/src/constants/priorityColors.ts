import type { PlatformPriority } from "@mp/task-core";
import type { VariantProps } from "class-variance-authority";

import type { badgeVariants } from "../components/ui/badge";

export type PriorityBadgeColorScheme = NonNullable<
  VariantProps<typeof badgeVariants>["colorScheme"]
>;

export const PRIORITY_NAME_COLOR_MAP: Record<string, PriorityBadgeColorScheme> = {
  Highest: "danger",
  High: "danger",
  Medium: "warning",
  Normal: "primary",
  Low: "neutral",
  Lowest: "neutral",
};

export function resolvePriorityBadgeColorScheme(
  priority?: PlatformPriority,
): PriorityBadgeColorScheme | null {
  const key = priority?.name ?? priority?.id;
  if (!key) return null;
  return PRIORITY_NAME_COLOR_MAP[key] ?? null;
}
