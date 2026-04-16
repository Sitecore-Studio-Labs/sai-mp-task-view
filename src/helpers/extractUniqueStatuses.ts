import { JiraProjectStatuses, JiraStatus } from "@/types/jira";

export function extractUniqueStatuses(projects?: JiraProjectStatuses[]) {
  if (!projects) return [];

  const map = new Map<string, JiraStatus>();

  projects.forEach((project) => {
    project.statuses.forEach((status) => {
      if (!map.has(status.id)) {
        map.set(status.id, status);
      }
    });
  });

  return Array.from(map.values());
}
