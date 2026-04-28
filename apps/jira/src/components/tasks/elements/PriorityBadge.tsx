"use client";

import Image from "next/image";

import { JiraPriority } from "../../../types/jira";

export function PriorityBadge({ priority }: { priority?: JiraPriority }) {
  return (
    <div className="flex items-center gap-1">
      {priority?.iconUrl && (
        <Image src={priority.iconUrl} alt={priority.name} width={12} height={12} />
      )}
      <span className="text-muted-foreground text-xs">{priority?.name || "No Priority"}</span>
    </div>
  );
}
