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
  const { data: projects = [] } = usePlatformProjects(selectedSiteId ?? "");

  const selections = useMemo((): Record<string, PlatformScopeSelection | null> => {
    if (!setupScope) return {};

    const site = selectedSiteId ? sites.find((item) => item.id === selectedSiteId) : null;
    const project = selectedProjectKey
      ? projects.find((item) => item.key === selectedProjectKey)
      : null;

    return {
      site: site ? { id: site.id, key: site.id, name: site.name, meta: { url: site.url } } : null,
      project: project ? { id: project.id, key: project.key, name: project.name } : null,
    };
  }, [setupScope, selectedSiteId, selectedProjectKey, sites, projects]);

  const handleSelectionChange = (levelId: string, selection: PlatformScopeSelection | null) => {
    if (levelId === "site") {
      onSiteChange(selection?.id ?? "");
      if (!selection) onProjectChange("");
      return;
    }
    if (levelId === "project") {
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
