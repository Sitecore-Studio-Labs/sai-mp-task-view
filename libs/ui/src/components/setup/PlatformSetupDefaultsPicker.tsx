"use client";

import { mdiCheck, mdiCrownOutline, mdiPencilOutline } from "@mdi/js";
import { usePlatformCapabilities, useTaskManager } from "@mp/task-core";

import { usePlatformProjects } from "../../hooks/usePlatformProjects";
import { Button } from "../ui/button";
import { Icon } from "../ui/icon";
import { SelectReact } from "../ui/select-react";
import { getSelectedOption, toProjectSelectOptions, toSiteSelectOptions } from "./selectOptions";

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

export function PlatformSetupDefaultsPicker({
  selectedSiteId,
  selectedProjectKey,
  onSiteChange,
  onProjectChange,
  siteTestId,
  projectTestId,
  readOnly = false,
  onToggleEdit,
  labelClassName = "text-muted-foreground text-xs font-bold tracking-wide uppercase",
  sitePlaceholder,
  projectPlaceholder,
}: PlatformSetupDefaultsPickerProps) {
  const { platformDisplayName } = usePlatformCapabilities();
  const { sites, sitesLoading: isSitesLoading } = useTaskManager();
  const { data: projects = [], isLoading: isProjectsLoading } = usePlatformProjects(
    selectedSiteId ?? "",
  );

  const siteOptions = toSiteSelectOptions(sites);
  const projectOptions = toProjectSelectOptions(projects);
  const selectedSiteOption = getSelectedOption(siteOptions, selectedSiteId);
  const selectedProjectOption = getSelectedOption(projectOptions, selectedProjectKey);
  const resolvedSitePlaceholder = sitePlaceholder ?? `Select ${platformDisplayName} site`;
  const resolvedProjectPlaceholder = projectPlaceholder ?? `Select ${platformDisplayName} project`;

  return (
    <div className="space-y-2">
      <div className="flex items-center justify-between">
        <p className={labelClassName}>Default Project</p>
        {onToggleEdit && (
          <Button
            type="button"
            variant="ghost"
            colorScheme="neutral"
            size="icon-sm"
            data-testid="defaults-picker-toggle-edit"
            onClick={onToggleEdit}
            aria-label="Edit default project selections"
          >
            <Icon
              path={readOnly ? mdiPencilOutline : mdiCheck}
              size="button"
              colorScheme="inherit"
              className="text-neutral-fg"
              scale={0.85}
            />
          </Button>
        )}
      </div>

      {readOnly ? (
        <div className="rounded-md border bg-slate-50 px-3 py-2">
          <div className="flex items-center gap-3">
            <div className="shrink-0 rounded-sm border p-2">
              <Icon
                path={mdiCrownOutline}
                colorScheme="inherit"
                className="text-neutral-fg"
                size="default"
                scale={1}
              />
            </div>
            <div className="min-w-0 text-left">
              <p data-testid={siteTestId} className="font-bold">
                {selectedProjectOption?.label ?? "Not selected"}
              </p>
              <p data-testid={projectTestId} className="text-muted-foreground text-sm">
                {selectedSiteOption?.label ?? "Not selected"}
              </p>
            </div>
          </div>
        </div>
      ) : (
        <>
          <div data-testid={siteTestId}>
            <SelectReact
              options={siteOptions}
              value={selectedSiteOption}
              isLoading={isSitesLoading}
              onChange={(option) => {
                if (option) onSiteChange(option.value);
              }}
              placeholder={resolvedSitePlaceholder}
              aria-label={resolvedSitePlaceholder}
              isDisabled={isSitesLoading}
            />
          </div>

          <div data-testid={projectTestId}>
            <SelectReact
              options={projectOptions}
              value={selectedProjectOption}
              isLoading={isProjectsLoading}
              onChange={(option) => {
                if (option) onProjectChange(option.value);
              }}
              placeholder={resolvedProjectPlaceholder}
              aria-label={resolvedProjectPlaceholder}
              isDisabled={!selectedSiteId || isProjectsLoading}
            />
          </div>
        </>
      )}
    </div>
  );
}
