"use client";

import { mdiChevronDown } from "@mdi/js";
import type { PlatformStatus } from "@mp/task-core";

import { Badge } from "../../ui/badge";
import { Icon } from "../../ui/icon";

/**
 * Maps standard task management status category keys to badge color schemes.
 * Jira uses "done" | "indeterminate" | "new". Other platforms use compatible keys.
 * Override by passing a colorScheme prop when platform-specific mapping is needed.
 */
const STATUS_COLOR_MAP: Record<string, "success" | "warning" | "neutral"> = {
  done: "success",
  indeterminate: "warning",
  new: "neutral",
};

export function StatusBadge({
  status,
  clickable = false,
}: {
  status?: PlatformStatus;
  clickable?: boolean;
}) {
  return (
    <Badge
      colorScheme={
        status?.statusCategory.key
          ? (STATUS_COLOR_MAP[status.statusCategory.key] ?? "neutral")
          : "neutral"
      }
      className="text-xs"
    >
      {status?.name || "No Status"}{" "}
      {clickable && (
        <Icon
          path={mdiChevronDown}
          size="sm"
          className="text-current [&_svg]:inline-block [&_svg]:text-current!"
        />
      )}
    </Badge>
  );
}
