"use client";

import { mdiWeb } from "@mdi/js";
import type { PlatformProject } from "@mp/task-core";

import { usePlatformProjects } from "../../hooks/usePlatformProjects";
import type { SitecoreSite } from "../../hooks/useSitecoreSites";
import { Badge } from "../ui/badge";
import { Icon } from "../ui/icon";
import { Switch } from "../ui/switch";
import { PlatformSetupDefaultsPicker } from "./PlatformSetupDefaultsPicker";

export type SiteMappingState = {
  useDefault: boolean;
  platformSiteId: string;
  projectKey: string;
  projectId: string;
  projectName?: string;
};

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
  const { data: projects = [] } = usePlatformProjects(mapping.platformSiteId || "");

  const displayName = site.displayName || site.name;
  const isMappingComplete = !mapping.useDefault && !!mapping.projectKey;

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
              aria-label={`Use default project for ${displayName}`}
              data-testid={`site-mapping-use-default-${site.id}`}
            />
          </div>
        </div>
      </div>

      {!mapping.useDefault && !isCollapsed && (
        <div className="mt-3">
          <PlatformSetupDefaultsPicker
            selectedSiteId={mapping.platformSiteId || null}
            selectedProjectKey={mapping.projectKey || null}
            onSiteChange={onSiteChange}
            onProjectChange={(projectKey) => {
              const p = projects.find((proj) => proj.key === projectKey) as PlatformProject;
              onProjectChange(projectKey, p?.id ?? "", p?.name);
            }}
            siteTestId={`site-mapping-jira-site-${site.id}`}
            projectTestId={`site-mapping-jira-project-${site.id}`}
            labelClassName="hidden"
          />
        </div>
      )}
    </div>
  );
}
