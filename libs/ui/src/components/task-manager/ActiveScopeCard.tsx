"use client";

import { mdiInformationOutline, mdiRestore, mdiSwapHorizontal } from "@mdi/js";
import {
  getActiveScopeHeading,
  getTaskListScopeLevel,
  getTenantScopeLevels,
  usePlatformCapabilities,
  useTaskManager,
} from "@mp/task-core";
import { useCallback, useMemo, useState } from "react";

import { usePlatformScopeOptions } from "../../hooks/usePlatformScopeOptions";
import {
  getSelectedOption,
  toProjectSelectOptions,
  toSiteSelectOptions,
} from "../setup/selectOptions";
import { Button } from "../ui/button";
import { Icon } from "../ui/icon";
import { SelectReact } from "../ui/select-react";
import { Separator } from "../ui/separator";
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "../ui/tooltip";

function formatSiteSubtext(site?: { url?: string; name?: string }): string {
  if (!site) return "";
  if (site.url) {
    try {
      const href = site.url.startsWith("http") ? site.url : `https://${site.url}`;
      const hostname = new URL(href).hostname;
      if (hostname) return hostname;
    } catch {
      /* use name fallback */
    }
  }
  return site.name ?? "";
}

type ScopeSelectionsState = Record<string, { id: string; key: string; name: string } | null>;

export function ActiveScopeCard() {
  const [isEditing, setIsEditing] = useState(false);
  const [editSelections, setEditSelections] = useState<ScopeSelectionsState>({});

  const { setupScope } = usePlatformCapabilities();

  const {
    sites,
    sitesLoading,
    selectedSiteId,
    setSelectedSiteId,
    effectiveProjectKey,
    hasTemporaryOverrides,
    setSelectedProjectKey,
    projects,
    projectsLoading,
    resetTemporaryOverrides,
    isMappedSetup,
  } = useTaskManager();

  // Derive scope levels before hooks that depend on them; memoized so the
  // references are stable across renders (avoids useCallback/useMemo churn).
  const taskListLevel = useMemo(
    () => (setupScope ? getTaskListScopeLevel(setupScope) : null),
    [setupScope],
  );
  const tenantLevels = useMemo(
    () => (setupScope ? getTenantScopeLevels(setupScope) : []),
    [setupScope],
  );

  const parentSelectionsForOptions = useMemo(() => {
    if (!setupScope || !taskListLevel) return {};
    const map: Record<string, { id: string; key: string; name: string } | null> = {};
    for (const level of setupScope.scopeLevels) {
      if (level.id === taskListLevel.id) continue;
      const fromEdit = editSelections[level.id];
      if (fromEdit) {
        map[level.id] = fromEdit;
        continue;
      }
      if (level.listSource === "sites") {
        const site = sites.find((s) => s.id === selectedSiteId);
        map[level.id] = site ? { id: site.id, key: site.id, name: site.name } : null;
      }
    }
    return map;
  }, [setupScope, taskListLevel, editSelections, sites, selectedSiteId]);

  const { options: taskListOptions, isLoading: taskListOptionsLoading } = usePlatformScopeOptions(
    taskListLevel?.id ?? "",
    parentSelectionsForOptions,
  );

  const handleTenantLevelChange = useCallback(
    (levelId: string, value: string) => {
      const level = tenantLevels.find((item) => item.id === levelId);
      if (!level) return;

      if (level.listSource === "sites") {
        setSelectedSiteId(value || null);
        setSelectedProjectKey(null);
        const site = sites.find((s) => s.id === value);
        setEditSelections((prev) => ({
          ...prev,
          [levelId]: site ? { id: site.id, key: site.id, name: site.name } : null,
        }));
      }
    },
    [tenantLevels, setSelectedSiteId, setSelectedProjectKey, sites],
  );

  // Early return after all hooks.
  if (!setupScope || !taskListLevel) {
    return null;
  }

  const heading = getActiveScopeHeading(setupScope);

  const effectiveProject = projects.find((p) => p.key === effectiveProjectKey);
  const effectiveSite = sites.find((s) => s.id === selectedSiteId);

  const taskListParentId = taskListLevel.parentLevelId
    ? (parentSelectionsForOptions[taskListLevel.parentLevelId]?.id ?? selectedSiteId ?? undefined)
    : undefined;

  const taskListSelectOptions = toProjectSelectOptions(
    taskListOptions.map((o) => ({ id: o.id, key: o.key, name: o.name })),
  );

  const handleStartEdit = () => {
    const initial: ScopeSelectionsState = {};
    for (const level of tenantLevels) {
      if (level.listSource === "sites") {
        const site = sites.find((s) => s.id === selectedSiteId);
        initial[level.id] = site ? { id: site.id, key: site.id, name: site.name } : null;
      }
    }
    setEditSelections(initial);
    setIsEditing(true);
  };

  const tooltipText = hasTemporaryOverrides
    ? "Temporary overrides"
    : isMappedSetup
      ? "Mapped setup"
      : "Default setup";

  const siteSubtext = tenantLevels.length > 0 ? formatSiteSubtext(effectiveSite) : null;

  return (
    <>
      <div className="wrapper flex w-full items-center justify-between">
        <div className="mb-1 w-full space-y-1">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <p className="text-muted-foreground text-sm font-semibold tracking-wide uppercase">
                {heading}
              </p>
              <TooltipProvider>
                <Tooltip>
                  <TooltipTrigger className="text-muted-foreground size-4.5 shrink-0 cursor-default bg-transparent p-0 leading-none">
                    <Icon path={mdiInformationOutline} size="inherit" colorScheme="inherit" />
                  </TooltipTrigger>
                  <TooltipContent side="right">{tooltipText}</TooltipContent>
                </Tooltip>
              </TooltipProvider>
            </div>
            <div className="flex items-center gap-1">
              {isEditing ? (
                <Button
                  type="button"
                  variant="ghost"
                  colorScheme="neutral"
                  size="icon-sm"
                  onClick={() => {
                    resetTemporaryOverrides();
                    setEditSelections({});
                    setIsEditing(false);
                  }}
                  aria-label={`Reset to default ${taskListLevel.label.toLowerCase()}`}
                >
                  <Icon path={mdiRestore} size={0.9} colorScheme="inherit" />
                </Button>
              ) : (
                <Button
                  type="button"
                  variant="ghost"
                  colorScheme="neutral"
                  size="icon-sm"
                  onClick={handleStartEdit}
                  aria-label={`Change active ${taskListLevel.label.toLowerCase()}`}
                  className="shrink-0"
                >
                  <Icon path={mdiSwapHorizontal} size={1} colorScheme="inherit" />
                </Button>
              )}
            </div>
          </div>

          {isEditing ? (
            <div className="mb-6 space-y-2">
              {tenantLevels.map((level) => {
                if (level.listSource !== "sites") return null;
                const siteOptions = toSiteSelectOptions(sites);
                const selected = getSelectedOption(siteOptions, selectedSiteId);
                return (
                  <div key={level.id}>
                    <SelectReact
                      options={siteOptions}
                      value={selected}
                      isLoading={sitesLoading}
                      onChange={(option) => {
                        if (option) handleTenantLevelChange(level.id, option.value);
                      }}
                      placeholder={`Select ${level.label}`}
                      aria-label={level.label}
                      isDisabled={sitesLoading}
                    />
                  </div>
                );
              })}
              <div>
                <SelectReact
                  options={taskListSelectOptions}
                  value={getSelectedOption(taskListSelectOptions, effectiveProjectKey)}
                  isLoading={taskListOptionsLoading || projectsLoading}
                  onChange={(option) => {
                    if (option) setSelectedProjectKey(option.value);
                  }}
                  placeholder={`Select ${taskListLevel.label}`}
                  aria-label={taskListLevel.label}
                  isDisabled={
                    (taskListLevel.parentLevelId ? !taskListParentId : false) ||
                    taskListOptionsLoading ||
                    projectsLoading
                  }
                />
              </div>
              <div className="text-muted-foreground text-sm">
                {hasTemporaryOverrides ? "This change is temporary and will not be saved." : ""}
              </div>
            </div>
          ) : (
            <div className="py-2">
              <div className="flex items-center gap-2">
                <div className="min-w-0 flex-1 space-y-1">
                  <div className="flex items-center gap-2">
                    {effectiveProjectKey && (
                      <span className="bg-primary-bg text-primary-fg shrink-0 rounded px-2 py-1 text-xs font-bold">
                        {effectiveProjectKey}
                      </span>
                    )}
                    <p className="text-foreground truncate font-bold">
                      {effectiveProject?.name ?? effectiveProjectKey ?? "Not selected"}
                    </p>
                  </div>
                  {siteSubtext ? (
                    <div className="mt-0.5 flex items-center">
                      <p className="text-muted-foreground truncate text-sm">{siteSubtext}</p>
                    </div>
                  ) : null}
                </div>
              </div>
            </div>
          )}
        </div>
      </div>
      <Separator />
    </>
  );
}
