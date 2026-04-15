"use client";

import { mdiChevronDown } from "@mdi/js";

import { Badge } from "@/components/ui/badge";
import { Icon } from "@/components/ui/icon";
import { STATUS_COLOR_SCHEME_MAP } from "@/constants/statuses";
import type { PlatformStatus } from "@/types/platform-entities";

type StatusLike = PlatformStatus & {
  statusCategory?: { key: string };
};

function resolveCategory(status?: StatusLike): string | undefined {
  if (status?.category) return status.category;
  return status?.statusCategory?.key;
}

export function StatusBadge({
  status,
  clickable = false,
}: {
  status?: StatusLike;
  clickable?: boolean;
}) {
  const category = resolveCategory(status);
  return (
    <Badge
      colorScheme={category ? STATUS_COLOR_SCHEME_MAP[category] || "neutral" : "neutral"}
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
