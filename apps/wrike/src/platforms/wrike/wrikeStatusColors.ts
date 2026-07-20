import type { PlatformStatusCategory } from "@mp/task-core";

import type { WrikeCustomStatus } from "@/types/wrike";

/** Maps Wrike workflow status colors to badge colorName keys used by StatusBadge. */
export function wrikeStatusColorToColorName(color?: string): string | undefined {
  if (!color) return undefined;

  const normalized = color.trim().toLowerCase();
  const map: Record<string, string> = {
    darkred: "red",
    red: "pink",
    purple: "purple",
    indigo: "indigo",
    darkblue: "blue",
    blue: "sky",
    turquoise: "cyan",
    darkcyan: "teal",
    green: "green",
    yellowgreen: "lime",
    yellow: "yellow",
    orange: "orange",
    brown: "stone",
    gray: "gray",
  };

  return map[normalized];
}

/**
 * Maps Wrike API standardName to platform statusCategory keys for semantic badge fallback.
 *
 * Wrike exposes four standardName values (Active, Completed, Deferred, Cancelled). Workflow
 * step labels such as "New", "In Progress", or "On Hold" are custom `name` values on
 * WrikeCustomStatus — they share a standardName for grouping, not a 1:1 label mapping.
 *
 * | Typical label | standardName | Category key    | Semantic badge (no Wrike color) |
 * |---------------|--------------|-----------------|-----------------------------------|
 * | New           | Active       | indeterminate   | primary                           |
 * | In Progress   | Active       | indeterminate   | primary                           |
 * | Completed     | Completed    | done            | success                           |
 * | On Hold       | Deferred     | new             | neutral                           |
 * | Cancelled     | Cancelled    | undefined       | danger                            |
 *
 * When Wrike provides a workflow color, adapters attach statusCategory.colorName. The UI
 * resolver (resolveStatusBadgeColorScheme) prefers colorName over category key.
 */
export function wrikeStandardNameToCategory(standardName: WrikeCustomStatus["standardName"]): {
  key: string;
  name: string;
} {
  switch (standardName) {
    case "Completed":
      return { key: "done", name: "Done" };
    case "Active":
      return { key: "indeterminate", name: "In Progress" };
    case "Deferred":
      return { key: "new", name: "Deferred" };
    case "Cancelled":
      return { key: "undefined", name: "Cancelled" };
    default:
      return { key: "undefined", name: standardName };
  }
}

/** Builds statusCategory from Wrike custom status metadata (colorName when configured). */
export function buildWrikeCustomStatusCategory(
  status: Pick<WrikeCustomStatus, "standardName" | "color">,
): PlatformStatusCategory {
  const category = wrikeStandardNameToCategory(status.standardName);
  const colorName = wrikeStatusColorToColorName(status.color);
  return {
    ...category,
    ...(colorName && { colorName }),
  };
}
