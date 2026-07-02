import {
  mdiChevronDoubleDown,
  mdiChevronDoubleUp,
  mdiChevronDown,
  mdiChevronUp,
  mdiEqual,
  mdiMinus,
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
  Highest: { path: mdiChevronDoubleUp, colorScheme: "danger" },
  High: { path: mdiChevronUp, colorScheme: "danger" },
  Medium: { path: mdiEqual, colorScheme: "warning" },
  Normal: { path: mdiMinus, colorScheme: "primary" },
  Low: { path: mdiChevronDown, colorScheme: "neutral" },
  Lowest: { path: mdiChevronDoubleDown, colorScheme: "neutral" },
};

export function resolvePriorityIcon(priority?: PlatformPriority): PriorityIcon | null {
  const key = priority?.id ?? priority?.name;
  if (!key) return null;
  return PRIORITY_NAME_ICON_MAP[key] ?? null;
}
