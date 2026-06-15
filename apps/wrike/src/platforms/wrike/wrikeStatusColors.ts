import type { WrikeCustomStatus } from "@/types/wrike";

/** Maps Wrike workflow status colors to badge colorName keys used by StatusBadge. */
export function wrikeStatusColorToColorName(color?: string): string | undefined {
  if (!color) return undefined;

  const normalized = color.trim().toLowerCase();
  const map: Record<string, string> = {
    green: "green",
    yellow: "yellow",
    orange: "yellow",
    red: "red",
    blue: "blue-gray",
    "blue-gray": "blue-gray",
    gray: "blue-gray",
    grey: "blue-gray",
    teal: "teal",
    cyan: "cyan",
    purple: "pink",
    pink: "pink",
  };

  return map[normalized];
}

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
