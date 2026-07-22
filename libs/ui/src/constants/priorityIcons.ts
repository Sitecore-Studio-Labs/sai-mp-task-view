import {
  mdiAlertBox,
  mdiArrowDownBold,
  mdiArrowDownThin,
  mdiEqual,
  mdiExclamationThick,
  mdiMinusThick,
} from "@mdi/js";
import type { PlatformPriority } from "@mp/task-core";

import type { iconVariants } from "../components/ui/icon";

export type PriorityIconColorScheme = NonNullable<
  NonNullable<Parameters<typeof iconVariants>[0]>["colorScheme"]
>;

export type PriorityIcon = {
  path: string;
  colorScheme: PriorityIconColorScheme;
};

export const PRIORITY_NAME_ICON_MAP: Record<string, PriorityIcon> = {
  Highest: { path: mdiAlertBox, colorScheme: "danger" },
  High: { path: mdiExclamationThick, colorScheme: "danger" },
  Medium: { path: mdiEqual, colorScheme: "warning" },
  Normal: { path: mdiMinusThick, colorScheme: "primary" },
  Low: { path: mdiArrowDownThin, colorScheme: "neutral" },
  Lowest: { path: mdiArrowDownBold, colorScheme: "neutral" },
};

export function resolvePriorityIcon(priority?: PlatformPriority): PriorityIcon | null {
  const key = priority?.id ?? priority?.name;
  if (!key) return null;
  return PRIORITY_NAME_ICON_MAP[key] ?? null;
}
