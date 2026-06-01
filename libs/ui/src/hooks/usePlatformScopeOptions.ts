"use client";

import type { PlatformScopeSelection, PlatformSite } from "@mp/task-core";
import { usePlatformCapabilities, useTaskManager } from "@mp/task-core";

import { usePlatformProjects } from "./usePlatformProjects";

export type PlatformScopeOption = PlatformScopeSelection;

const siteToScopeOption = (site: PlatformSite): PlatformScopeOption => ({
  id: site.id,
  key: site.id,
  name: site.name,
  meta: { url: site.url },
});

const projectToScopeOption = (project: {
  id: string;
  key: string;
  name: string;
}): PlatformScopeOption => ({
  id: project.id,
  key: project.key,
  name: project.name,
});

/**
 * Loads dropdown options for one setup scope level.
 * `folders`, `boards`, and `workspaces` alias the projects BFF route
 * (Wrike folders and Monday boards are normalized as PlatformProject).
 */
export function usePlatformScopeOptions(
  levelId: string,
  parentSelections: Record<string, PlatformScopeSelection | null>,
): { options: PlatformScopeOption[]; isLoading: boolean } {
  const { setupScope } = usePlatformCapabilities();
  const { sites, sitesLoading } = useTaskManager();

  const level = setupScope?.scopeLevels.find((item) => item.id === levelId);
  const parentId = level?.parentLevelId ? parentSelections[level.parentLevelId]?.id : undefined;

  const usesProjectList =
    level?.listSource === "projects" ||
    level?.listSource === "folders" ||
    level?.listSource === "boards" ||
    level?.listSource === "workspaces";

  const { data: projects = [], isLoading: projectsLoading } = usePlatformProjects(
    usesProjectList ? (parentId ?? "") : undefined,
  );

  if (!level) {
    return { options: [], isLoading: false };
  }

  switch (level.listSource) {
    case "sites":
      return {
        options: sites.map(siteToScopeOption),
        isLoading: sitesLoading,
      };
    case "projects":
    case "folders":
    case "boards":
    case "workspaces":
      return {
        options: projects.map(projectToScopeOption),
        isLoading: projectsLoading,
      };
    default:
      return { options: [], isLoading: false };
  }
}
