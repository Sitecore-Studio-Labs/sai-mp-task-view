"use client";

import { mdiChevronDown } from "@mdi/js";
import type { PlatformStatus } from "@mp/task-core";

import { resolveStatusBadgeColorScheme } from "../../../constants/statusCategoryColors";
import { Badge } from "../../ui/badge";
import { Icon } from "../../ui/icon";

export function StatusBadge({
  status,
  clickable = false,
}: {
  status?: PlatformStatus;
  clickable?: boolean;
}) {
  return (
    <Badge colorScheme={resolveStatusBadgeColorScheme(status)} className="text-xs">
      {status?.name || "No Status"}{" "}
      {clickable && (
        <Icon
          path={mdiChevronDown}
          size="sm"
          colorScheme="inherit"
          className="text-current [&_svg]:inline-block"
        />
      )}
    </Badge>
  );
}
