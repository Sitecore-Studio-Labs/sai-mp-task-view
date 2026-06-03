"use client";

import type { PlatformPriority } from "@mp/task-core";
import Image from "next/image";

export function PriorityBadge({ priority }: { priority?: PlatformPriority }) {
  return (
    <div className="flex items-center gap-1">
      {priority?.iconUrl && (
        <Image src={priority.iconUrl} alt={priority.name ?? ""} width={12} height={12} />
      )}
      <span className="text-muted-foreground text-xs">{priority?.name || "No Priority"}</span>
    </div>
  );
}
