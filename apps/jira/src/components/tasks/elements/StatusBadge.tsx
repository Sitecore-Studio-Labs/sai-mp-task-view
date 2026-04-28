"use client";

import { mdiChevronDown } from "@mdi/js";
import { Badge, Icon } from "@mp/ui";

import { STATUS_COLOR_SCHEME_MAP } from "../../../constants/statuses";
import { JiraIssue } from "../../../types/jira";

export function StatusBadge({
  status,
  clickable = false,
}: {
  status?: JiraIssue["fields"]["status"];
  clickable?: boolean;
}) {
  return (
    <Badge
      colorScheme={
        status?.statusCategory.key
          ? STATUS_COLOR_SCHEME_MAP[status.statusCategory.key] || "neutral"
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
