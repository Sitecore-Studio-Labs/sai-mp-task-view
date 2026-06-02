"use client";

import { mdiWeb } from "@mdi/js";
import type { PlatformScopeSelection } from "@mp/task-core";
import {
  getTaskListScopeLevel,
  mappingRequiresTenantSite,
  usePlatformCapabilities,
} from "@mp/task-core";
import { useMemo } from "react";

import type { SitecoreSite } from "../../hooks/useSitecoreSites";
import { Badge } from "../ui/badge";
import { Icon } from "../ui/icon";
import { Switch } from "../ui/switch";
import { PlatformSetupScopePicker } from "./PlatformSetupScopePicker";

export type SiteMappingState = {
  useDefault: boolean;
  platformSiteId: string;
  projectKey: string;
  projectId: string;
  projectName?: string;
};

export function isSiteMappingPersistable(
  mapping: SiteMappingState,
  requiresTenantSite: boolean,
): boolean {
  if (mapping.useDefault) return false;
  if (!mapping.projectKey || !mapping.projectId) return false;
  if (requiresTenantSite && !mapping.platformSiteId) return false;
  return true;
}

type SiteMappingRowProps = {
  site: SitecoreSite;
  mapping: SiteMappingState;
  isSaving: boolean;
  isCurrent: boolean;
  isCollapsed: boolean;
  onToggleCollapse: () => void;
  onToggleUseDefault: (useDefault: boolean) => void;
  onSiteChange: (siteId: string) => void;
  onProjectChange: (projectKey: string, projectId: string, projectName?: string) => void;
};

export default function SiteMappingRow({
  site,
  mapping,
  isSaving,
  isCurrent,
  isCollapsed,
  onToggleCollapse,
  onToggleUseDefault,
  onSiteChange,
  onProjectChange,
}: SiteMappingRowProps) {
  const { setupScope } = usePlatformCapabilities();
  const requiresTenantSite = setupScope ? mappingRequiresTenantSite(setupScope) : false;
  const taskListLabel = setupScope ? getTaskListScopeLevel(setupScope).label : "Project";

  const displayName = site.displayName || site.name;
  const isMappingComplete = isSiteMappingPersistable(mapping, requiresTenantSite);

  const selections = useMemo((): Record<string, PlatformScopeSelection | null> => {
    if (!setupScope) return {};

    const result: Record<string, PlatformScopeSelection | null> = {};
    for (const level of setupScope.scopeLevels) {
      if (level.listSource === "sites") {
        result[level.id] = mapping.platformSiteId
          ? {
              id: mapping.platformSiteId,
              key: mapping.platformSiteId,
              name: mapping.platformSiteId,
            }
          : null;
        continue;
      }
      if (
        level.listSource === "projects" ||
        level.listSource === "folders" ||
        level.listSource === "boards" ||
        level.listSource === "workspaces"
      ) {
        result[level.id] = mapping.projectKey
          ? {
              id: mapping.projectId || mapping.projectKey,
              key: mapping.projectKey,
              name: mapping.projectName ?? mapping.projectKey,
            }
          : null;
      }
    }
    return result;
  }, [
    setupScope,
    mapping.platformSiteId,
    mapping.projectKey,
    mapping.projectId,
    mapping.projectName,
  ]);

  const handleSelectionChange = (levelId: string, selection: PlatformScopeSelection | null) => {
    const level = setupScope?.scopeLevels.find((item) => item.id === levelId);
    if (!level) return;

    if (level.listSource === "sites") {
      onSiteChange(selection?.id ?? "");
      return;
    }
    if (
      level.listSource === "projects" ||
      level.listSource === "folders" ||
      level.listSource === "boards" ||
      level.listSource === "workspaces"
    ) {
      const key = selection?.key ?? "";
      onProjectChange(key, selection?.id ?? "", selection?.name);
    }
  };

  return (
    <div
      className={`rounded-md border bg-slate-50 p-3 ${isCurrent ? "border-primary/40" : ""}`}
      data-testid={`site-mapping-row-${site.id}`}
    >
      <div
        className={isMappingComplete ? "cursor-pointer select-none" : undefined}
        onClick={isMappingComplete ? onToggleCollapse : undefined}
        role={isMappingComplete ? "button" : undefined}
        aria-expanded={isMappingComplete ? !isCollapsed : undefined}
        aria-label={
          isMappingComplete
            ? isCollapsed
              ? `Expand ${displayName} mapping`
              : `Collapse ${displayName} mapping`
            : undefined
        }
        data-testid={`site-mapping-header-${site.id}`}
      >
        <div className="flex items-center justify-between gap-2">
          <div className="flex min-w-0 items-center gap-2">
            <Icon
              path={mdiWeb}
              size="sm"
              colorScheme="inherit"
              className="text-muted-foreground shrink-0"
            />
            <div className="min-w-0">
              <div className="flex items-center gap-1.5">
                <p className="truncate text-sm font-medium">{displayName}</p>
                {isCurrent && (
                  <Badge colorScheme="primary" size="sm" className="shrink-0">
                    Current
                  </Badge>
                )}
              </div>
            </div>
          </div>
          <div className="flex shrink-0 items-center gap-1.5" onClick={(e) => e.stopPropagation()}>
            <span className="text-muted-foreground text-xs">Use Default</span>
            <Switch
              checked={mapping.useDefault}
              onCheckedChange={onToggleUseDefault}
              disabled={isSaving}
              aria-label={`Use default ${taskListLabel.toLowerCase()} for ${displayName}`}
              data-testid={`site-mapping-use-default-${site.id}`}
            />
          </div>
        </div>
      </div>

      {!mapping.useDefault && !isCollapsed && setupScope && (
        <div className="mt-3">
          <PlatformSetupScopePicker
            variant="inline"
            selections={selections}
            onSelectionChange={handleSelectionChange}
            testIdPrefix={`site-mapping-${site.id}`}
          />
        </div>
      )}
    </div>
  );
}
