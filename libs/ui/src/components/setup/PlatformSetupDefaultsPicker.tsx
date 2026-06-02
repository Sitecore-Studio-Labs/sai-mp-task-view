"use client";

import type { PlatformScopeSelection } from "@mp/task-core";
import { usePlatformCapabilities, useTaskManager } from "@mp/task-core";
import { useMemo } from "react";

import { usePlatformProjects } from "../../hooks/usePlatformProjects";
import { PlatformSetupScopePicker } from "./PlatformSetupScopePicker";

export type PlatformSetupDefaultsPickerProps = {
  selectedSiteId: string | null;
  selectedProjectKey: string | null;
  onSiteChange: (value: string) => void;
  onProjectChange: (value: string) => void;
  siteTestId: string;
  projectTestId: string;
  readOnly?: boolean;
  onToggleEdit?: () => void;
  labelClassName?: string;
  sitePlaceholder?: string;
  projectPlaceholder?: string;
};

/** @deprecated Prefer PlatformSetupScopePicker — kept for settings panel compatibility. */
export function PlatformSetupDefaultsPicker({
  selectedSiteId,
  selectedProjectKey,
  onSiteChange,
  onProjectChange,
  siteTestId,
  projectTestId: _projectTestId,
  readOnly = false,
  onToggleEdit,
  labelClassName,
}: PlatformSetupDefaultsPickerProps) {
  const { setupScope } = usePlatformCapabilities();
  const { sites } = useTaskManager();
  const listLevel = setupScope?.scopeLevels.find(
    (item) =>
      item.listSource === "projects" ||
      item.listSource === "folders" ||
      item.listSource === "boards" ||
      item.listSource === "workspaces",
  );
  const projectsSiteId = listLevel?.parentLevelId ? (selectedSiteId ?? "") : undefined;
  const { data: projects = [] } = usePlatformProjects(projectsSiteId);

  const selections = useMemo((): Record<string, PlatformScopeSelection | null> => {
    if (!setupScope) return {};

    const result: Record<string, PlatformScopeSelection | null> = {};
    for (const level of setupScope.scopeLevels) {
      if (level.listSource === "sites") {
        const site = selectedSiteId ? sites.find((item) => item.id === selectedSiteId) : null;
        result[level.id] = site
          ? { id: site.id, key: site.id, name: site.name, meta: { url: site.url } }
          : null;
        continue;
      }
      if (
        level.listSource === "projects" ||
        level.listSource === "folders" ||
        level.listSource === "boards" ||
        level.listSource === "workspaces"
      ) {
        const project = selectedProjectKey
          ? projects.find((item) => item.key === selectedProjectKey)
          : null;
        result[level.id] = project
          ? { id: project.id, key: project.key, name: project.name }
          : null;
      }
    }
    return result;
  }, [setupScope, selectedSiteId, selectedProjectKey, sites, projects]);

  const handleSelectionChange = (levelId: string, selection: PlatformScopeSelection | null) => {
    const level = setupScope?.scopeLevels.find((item) => item.id === levelId);
    if (!level) return;

    if (level.listSource === "sites") {
      onSiteChange(selection?.id ?? "");
      if (!selection) onProjectChange("");
      return;
    }
    if (
      level.listSource === "projects" ||
      level.listSource === "folders" ||
      level.listSource === "boards" ||
      level.listSource === "workspaces"
    ) {
      onProjectChange(selection?.key ?? "");
    }
  };

  if (!setupScope) {
    return null;
  }

  return (
    <PlatformSetupScopePicker
      selections={selections}
      onSelectionChange={handleSelectionChange}
      readOnly={readOnly}
      onToggleEdit={onToggleEdit}
      labelClassName={labelClassName}
      testIdPrefix={siteTestId.replace(/-site$/, "") || "defaults-picker"}
    />
  );
}
