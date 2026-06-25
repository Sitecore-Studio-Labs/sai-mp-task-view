import type { PlatformProjectStatuses, PlatformStatus } from "@mp/task-core";
import type { ReactNode } from "react";

import { groupStatusesByWorkflow } from "./projectStatuses";

export type StatusOption = {
  value: string;
  label: string;
  displayLabel: ReactNode;
};

export type StatusOptionGroup = {
  label: string;
  options: StatusOption[];
  /** When true, group is collapsed by default behind a toggle (Wrike account workflows). */
  collapsible?: boolean;
  defaultOpen?: boolean;
};

export function buildStatusOptionGroups(
  statusesData: PlatformProjectStatuses[] | undefined,
  renderStatus: (status: PlatformStatus) => ReactNode,
): { groups: StatusOptionGroup[]; useGroupedOptions: boolean } {
  const workflowGroups = groupStatusesByWorkflow(statusesData);
  const groups = workflowGroups.map((workflow, index) => ({
    label: workflow.workflowName,
    options: workflow.statuses.map((status) => ({
      value: status.id ?? status.name ?? "",
      label: status.name ?? "",
      displayLabel: renderStatus(status),
    })),
    collapsible: index > 0,
    defaultOpen: index === 0,
  }));

  return {
    groups,
    useGroupedOptions: groups.length > 1,
  };
}
