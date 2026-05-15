"use client";

import { mdiWeb } from "@mdi/js";

import DefaultsPicker from "@/components/setup-wizard/DefaultsPicker";
import { Badge } from "@/components/ui/badge";
import { Switch } from "@/components/ui/switch";
import { useAutoSelectSingleJiraSite } from "@/hooks/useAutoSelectSingleJiraSite";
import { useJiraProjects } from "@/hooks/useJiraProjects";
import { type SitecoreSite } from "@/hooks/useSitecoreSites";
import { Icon } from "@/lib/icon";
import { useTaskManager } from "@/providers/task-manager/TaskManagerProvider";

export type SiteMappingState = {
  useDefault: boolean;
  jiraSiteId: string;
  jiraProjectKey: string;
  jiraProjectId: string;
  jiraProjectName?: string;
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
  const { sites } = useTaskManager();
  const { data: projects = [] } = useJiraProjects(mapping.jiraSiteId || "");

  useAutoSelectSingleJiraSite(
    sites,
    mapping.jiraSiteId || null,
    onSiteChange,
    !mapping.useDefault && !isCollapsed,
  );

  const displayName = site.displayName || site.name;
  const isMappingComplete = !mapping.useDefault && !!mapping.jiraProjectKey;

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
            <Icon path={mdiWeb} className="text-muted-foreground size-4 shrink-0" />
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
          <DefaultsPicker
            selectedSiteId={mapping.jiraSiteId || null}
            selectedProjectKey={mapping.jiraProjectKey || null}
            onSiteChange={onSiteChange}
            onProjectChange={(projectKey) => {
              const p = projects.find((proj) => proj.key === projectKey);
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
