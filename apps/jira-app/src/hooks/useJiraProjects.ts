import { useQuery } from "@tanstack/react-query";

import { taskPlatform } from "@/lib/task-platform";
import type { JiraProject } from "@/types/jira";

import { JIRA_PROJECTS_QUERY_KEY } from "./useJiraConnectionStatus";

/**
 * Loads Jira projects via {@link taskPlatform} (PHASE 3.3 — provider-based BFF access).
 */
export const useJiraProjects = () => {
  return useQuery({
    queryKey: JIRA_PROJECTS_QUERY_KEY,
    queryFn: async (): Promise<JiraProject[]> => {
      const projects = await taskPlatform.getProjects();
      return projects as JiraProject[];
    },
  });
};
