import type { PlatformProjectStatuses, PlatformStatus } from "@mp/task-core";

export type StatusWorkflowGroup = {
  workflowId: string;
  workflowName: string;
  statuses: PlatformStatus[];
  standard?: boolean;
};

function compareWorkflowGroups(a: StatusWorkflowGroup, b: StatusWorkflowGroup): number {
  const aStandard = a.standard ?? false;
  const bStandard = b.standard ?? false;
  if (aStandard !== bStandard) return aStandard ? 1 : -1;
  return a.workflowName.localeCompare(b.workflowName, undefined, { sensitivity: "base" });
}

export function groupStatusesByWorkflow(
  projects?: PlatformProjectStatuses[],
): StatusWorkflowGroup[] {
  if (!projects) return [];

  return projects
    .filter((project) => project.statuses?.length)
    .map((project) => ({
      workflowId: project.id,
      workflowName: project.name,
      statuses: project.statuses,
      standard: project.standard,
    }))
    .sort(compareWorkflowGroups);
}

export function extractUniqueStatuses(projects?: PlatformProjectStatuses[]): PlatformStatus[] {
  if (!projects) return [];
  const map = new Map<string, PlatformStatus>();
  projects.forEach((project) => {
    if (!project.statuses?.length) return;
    project.statuses.forEach((status) => {
      const key = status.id ?? status.name ?? "";
      if (key && !map.has(key)) {
        map.set(key, status);
      }
    });
  });
  return Array.from(map.values());
}
