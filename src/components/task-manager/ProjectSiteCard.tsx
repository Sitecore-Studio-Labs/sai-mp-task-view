"use client";

import { mdiInformationOutline, mdiRestore, mdiSwapHorizontal } from "@mdi/js";
import { useState } from "react";

import {
  getSelectedOption,
  toProjectSelectOptions,
  toSiteSelectOptions,
} from "@/components/setup-wizard/selectOptions";
import { Button } from "@/components/ui/button";
import { SelectReact } from "@/components/ui/select-react";
import { Icon } from "@/lib/icon";
import { useTaskManager } from "@/providers/task-manager/TaskManagerProvider";

import { Separator } from "../ui/separator";
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "../ui/tooltip";

export function ProjectSiteCard() {
  const [isEditing, setIsEditing] = useState(false);

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

  const effectiveProject = projects.find((p) => p.key === effectiveProjectKey);
  const effectiveSite = sites.find((s) => s.id === selectedSiteId);

  const siteOptions = toSiteSelectOptions(sites);
  const projectOptions = toProjectSelectOptions(projects);
  const selectedSiteOption = getSelectedOption(siteOptions, selectedSiteId);
  const selectedProjectOption = getSelectedOption(projectOptions, effectiveProjectKey);

  const tooltipText = hasTemporaryOverrides
    ? "Temporary overrides"
    : isMappedSetup
      ? "Mapped setup"
      : "Default setup";

  return (
    <>
      <div className="wrapper flex w-full items-center justify-between">
        <div className="mb-1 w-full space-y-1">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <p className="text-muted-foreground text-sm font-semibold tracking-wide uppercase">
                Active Project
              </p>
              <TooltipProvider>
                <Tooltip>
                  <TooltipTrigger className="text-muted-foreground size-4.5 shrink-0 cursor-default bg-transparent p-0 leading-none">
                    <Icon path={mdiInformationOutline} />
                  </TooltipTrigger>
                  <TooltipContent side="right">{tooltipText}</TooltipContent>
                </Tooltip>
              </TooltipProvider>
            </div>
            <div className="flex items-center gap-1">
              {isEditing && (
                <Button
                  type="button"
                  variant="ghost"
                  colorScheme="neutral"
                  size="icon-sm"
                  onClick={() => {
                    resetTemporaryOverrides();
                    setIsEditing(false);
                  }}
                  aria-label="Reset to default project"
                >
                  <Icon path={mdiRestore} size={0.9} />
                </Button>
              )}
            </div>
          </div>

          {isEditing ? (
            <div className="mb-6 space-y-2">
              <div>
                <SelectReact
                  options={siteOptions}
                  value={selectedSiteOption}
                  isLoading={sitesLoading}
                  onChange={(option) => {
                    if (option) setSelectedSiteId(option.value);
                  }}
                  placeholder="Select Jira site"
                  aria-label="Jira site"
                  isDisabled={sitesLoading}
                />
              </div>
              <div>
                <SelectReact
                  options={projectOptions}
                  value={selectedProjectOption}
                  isLoading={projectsLoading}
                  onChange={(option) => {
                    if (option) setSelectedProjectKey(option.value);
                  }}
                  placeholder="Select Jira project"
                  aria-label="Jira project"
                  isDisabled={!selectedSiteId || projectsLoading}
                />
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
                    <p className="truncate font-bold">
                      {effectiveProject?.name ?? effectiveProjectKey ?? "Not selected"}
                    </p>
                  </div>
                  <div className="mt-0.5 flex items-center">
                    <p className="text-muted-foreground truncate text-sm">
                      {effectiveSite?.name ?? "Not selected"}
                    </p>
                  </div>
                </div>
              </div>
            </div>
          )}
        </div>
        {!isEditing && (
          <Button
            type="button"
            variant="ghost"
            colorScheme="neutral"
            size="icon-sm"
            onClick={() => setIsEditing(true)}
            aria-label="Change project and site"
            className="shrink-0"
          >
            <Icon path={mdiSwapHorizontal} size={1.2} />
          </Button>
        )}
      </div>
      <Separator />
    </>
  );
}
