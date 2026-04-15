"use client";

import Image from "next/image";

import type { PlatformPriority } from "@/types/platform-entities";

export function PriorityBadge({ priority }: { priority?: PlatformPriority }) {
  return (
    <div className="flex items-center gap-1">
      {priority?.iconUrl && (
        <Image src={priority.iconUrl} alt={priority.name} width={12} height={12} />
      )}
      <span className="text-muted-foreground text-xs">{priority?.name || "No Priority"}</span>
    </div>
  );
}
