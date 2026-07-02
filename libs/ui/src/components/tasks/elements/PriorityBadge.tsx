"use client";

import type { PlatformPriority } from "@mp/task-core";

import { resolvePriorityIcon } from "../../../constants/priorityIcons";
import { Icon } from "../../ui/icon";

export function PriorityBadge({ priority }: { priority?: PlatformPriority }) {
  const label = priority?.name || "Unknown";
  const fallbackIcon = resolvePriorityIcon(priority);

  return (
    <span className="inline-flex items-center gap-1.5 text-xs">
      {priority?.iconUrl ? (
        <img src={priority.iconUrl} alt="" className="size-4 shrink-0 object-contain" />
      ) : fallbackIcon ? (
        <Icon
          path={fallbackIcon.path}
          size="sm"
          colorScheme={fallbackIcon.colorScheme}
          className="shrink-0"
        />
      ) : null}
      <span className="text-muted-foreground">{label}</span>
    </span>
  );
}
