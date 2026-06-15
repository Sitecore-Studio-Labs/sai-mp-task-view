"use client";

import type { PlatformPriority } from "@mp/task-core";
import Image from "next/image";

import { resolvePriorityBadgeColorScheme } from "../../../constants/priorityColors";
import { Badge } from "../../ui/badge";

export function PriorityBadge({ priority }: { priority?: PlatformPriority }) {
  const colorScheme = resolvePriorityBadgeColorScheme(priority);
  const label = priority?.name || "No Priority";

  if (colorScheme) {
    return (
      <Badge colorScheme={colorScheme} className="text-xs">
        {label}
      </Badge>
    );
  }

  return (
    <div className="flex items-center gap-1">
      {priority?.iconUrl && (
        <Image src={priority.iconUrl} alt={priority.name ?? ""} width={12} height={12} />
      )}
      <span className="text-muted-foreground text-xs">{label}</span>
    </div>
  );
}
