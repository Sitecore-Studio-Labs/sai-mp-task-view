import { usePlatformProjects } from "@mp/ui";

export const useJiraProjects = (cloudId?: string) => {
  return usePlatformProjects(cloudId);
};
