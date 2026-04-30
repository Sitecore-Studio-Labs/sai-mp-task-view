"use client";

import { mdiCheck, mdiCrownOutline, mdiPencilOutline } from "@mdi/js";

import { Button } from "@/components/ui/button";
import { SelectReact } from "@/components/ui/select-react";
import { useJiraProjects } from "@/hooks/useJiraProjects";
import { Icon } from "@/lib/icon";
import { useTaskManager } from "@/providers/task-manager/TaskManagerProvider";

import { getSelectedOption, toProjectSelectOptions, toSiteSelectOptions } from "./selectOptions";

type DefaultsPickerProps = {
  selectedSiteId: string | null;
  selectedProjectKey: string | null;
  onSiteChange: (value: string) => void;
  onProjectChange: (value: string) => void;
  siteTestId: string;
  projectTestId: string;
  readOnly?: boolean;
  onToggleEdit?: () => void;
  labelClassName?: string;
};

export default function DefaultsPicker({
  selectedSiteId,
  selectedProjectKey,
  onSiteChange,
  onProjectChange,
  siteTestId,
  projectTestId,
  readOnly = false,
  onToggleEdit,
  labelClassName = "text-muted-foreground text-xs font-bold uppercase",
}: DefaultsPickerProps) {
  const { sites, sitesLoading: isJiraSitesLoading } = useTaskManager();
  const { data: projects = [], isLoading: isProjectsLoading } = useJiraProjects(
    selectedSiteId || "",
  );

  const siteOptions = toSiteSelectOptions(sites);
  const projectOptions = toProjectSelectOptions(projects);
  const selectedSiteOption = getSelectedOption(siteOptions, selectedSiteId);
  const selectedProjectOption = getSelectedOption(projectOptions, selectedProjectKey);

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
            <Icon path={readOnly ? mdiPencilOutline : mdiCheck} size={0.85} />
          </Button>
        )}
      </div>

      {readOnly ? (
        <div className="rounded-md border bg-slate-50 px-3 py-2">
          <div className="flex items-center gap-3">
            <div className="shrink-0 rounded-sm border p-2">
              <Icon path={mdiCrownOutline} className="size-6" />
            </div>
            <div>
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
              isLoading={isJiraSitesLoading}
              onChange={(option) => {
                if (option) onSiteChange(option.value);
              }}
              placeholder="Select Jira site"
              aria-label="Default Jira site"
              isDisabled={isJiraSitesLoading}
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
              placeholder="Select Jira project"
              aria-label="Default Jira project"
              isDisabled={!selectedSiteId || isProjectsLoading}
            />
          </div>
        </>
      )}
    </div>
  );
}
