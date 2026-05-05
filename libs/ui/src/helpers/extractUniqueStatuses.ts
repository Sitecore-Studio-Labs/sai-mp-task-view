import type { PlatformProjectStatuses, PlatformStatus } from "@mp/task-core";

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
