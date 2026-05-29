"use client";

import { mdiChevronDown, mdiDeleteOutline } from "@mdi/js";
import type { PlatformExternalResource } from "@mp/task-core";
import { usePlatformCapabilities, useTaskManager } from "@mp/task-core";

import { usePlatformProjects } from "../../hooks/usePlatformProjects";
import { Button } from "../ui/button";
import { Icon } from "../ui/icon";
import { SelectReact } from "../ui/select-react";
import {
  getSelectedOption,
  toExternalResourceSelectOptions,
  toProjectSelectOptions,
  toSiteSelectOptions,
} from "./selectOptions";

export type PlatformSetupDraftMapping = {
  id: string;
  externalResourceId: string;
  siteId: string;
  projectKey: string;
  projectId: string;
  projectName?: string;
};

type PlatformSetupMappingCardProps = {
  mapping: PlatformSetupDraftMapping;
  externalResources: PlatformExternalResource[];
  isExternalResourcesLoading: boolean;
  mappedExternalResources: Set<string>;
  externalResourceLabel?: string;
  onChange: (
    mappingId: string,
    field: "externalResourceId" | "siteId" | "projectKey",
    value: string,
    project?: { id: string; name: string } | null,
  ) => void;
  onDelete: (mappingId: string) => void;
};

export function PlatformSetupMappingCard({
  mapping,
  externalResources,
  isExternalResourcesLoading,
  mappedExternalResources,
  externalResourceLabel = "Website",
  onChange,
  onDelete,
}: PlatformSetupMappingCardProps) {
  const { platformDisplayName } = usePlatformCapabilities();
  const { sites, sitesLoading: isSitesLoading } = useTaskManager();
  const { data: projects = [], isLoading: isProjectsLoading } = usePlatformProjects(
    mapping.siteId || "",
  );
  const externalResourceOptions = toExternalResourceSelectOptions(
    externalResources,
    mappedExternalResources,
  );
  const siteOptions = toSiteSelectOptions(sites);
  const projectOptions = toProjectSelectOptions(projects);

  const selectedExternalResource = getSelectedOption(
    externalResourceOptions,
    mapping.externalResourceId,
  );
  const selectedSite = getSelectedOption(siteOptions, mapping.siteId);
  const selectedProject = getSelectedOption(projectOptions, mapping.projectKey);

  return (
    <div className="relative rounded-md border bg-slate-50 p-4" data-testid="mapping-box">
      <div className="flex flex-row-reverse items-center gap-2">
        <Button
          type="button"
          variant="ghost"
          colorScheme="neutral"
          size="icon-sm"
          data-testid="delete-mapping"
          onClick={() => onDelete(mapping.id)}
          aria-label="Delete mapping"
        >
          <Icon
            path={mdiDeleteOutline}
            size={0.85}
            colorScheme="inherit"
            className="text-body-text"
          />
        </Button>

        <div className="w-full" data-testid="mapping-external-resource">
          <SelectReact
            options={externalResourceOptions}
            value={selectedExternalResource}
            isLoading={isExternalResourcesLoading}
            onChange={(option) => {
              if (option) onChange(mapping.id, "externalResourceId", option.value);
            }}
            placeholder={`Select ${externalResourceLabel.toLowerCase()}`}
            aria-label={externalResourceLabel}
          />
        </div>
      </div>

      <Icon
        path={mdiChevronDown}
        colorScheme="inherit"
        className="text-muted-foreground mx-auto my-2 block size-6"
      />

      <div className="mb-2" data-testid="mapping-site">
        <SelectReact
          options={siteOptions}
          value={selectedSite}
          isLoading={isSitesLoading}
          onChange={(option) => {
            if (option) onChange(mapping.id, "siteId", option.value);
          }}
          placeholder={`Select ${platformDisplayName} site`}
          aria-label={`${platformDisplayName} site`}
        />
      </div>

      <div data-testid="mapping-project">
        <SelectReact
          options={projectOptions}
          value={selectedProject}
          isLoading={isProjectsLoading}
          onChange={(option) => {
            if (option) {
              const project = projects.find((item) => item.key === option.value);
              onChange(
                mapping.id,
                "projectKey",
                option.value,
                project ? { id: project.id, name: project.name } : null,
              );
            }
          }}
          placeholder={`Select ${platformDisplayName} project`}
          aria-label={`${platformDisplayName} project`}
          isDisabled={!mapping.siteId || isProjectsLoading}
        />
      </div>
    </div>
  );
}
