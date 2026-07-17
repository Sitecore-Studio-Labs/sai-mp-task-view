import type { PlatformStatus } from "@mp/task-core";

import type { JiraStatus } from "@/types/jira";

/** Maps Jira statusCategory.colorName values to badge colorName keys used by StatusBadge. */
export function jiraStatusColorToColorName(color?: string): string | undefined {
  if (!color) return undefined;

  const normalized = color.trim().toLowerCase();
  const map: Record<string, string> = {
    "blue-gray": "gray",
    yellow: "purple", // Jira API returns "yellow" for the "indeterminate" statusCategory, but we want to use another color.
    green: "green",
  };

  return map[normalized] ?? normalized;
}

export function jiraStatusToPlatformStatus(status: JiraStatus): PlatformStatus {
  const colorName = jiraStatusColorToColorName(status.statusCategory?.colorName);

  return {
    id: status.id,
    name: status.name,
    statusCategory: {
      key: status.statusCategory.key,
      name: status.statusCategory.name,
      ...(colorName && { colorName }),
    },
  };
}
