"use client";

import { mdiChevronDown, mdiDeleteOutline } from "@mdi/js";

import { Button } from "@/components/ui/button";
import { SelectReact } from "@/components/ui/select-react";
import { useJiraProjects } from "@/hooks/useJiraProjects";
import { SitecoreSite } from "@/hooks/useSitecoreSites";
import { Icon } from "@/lib/icon";
import { useTaskManager } from "@/providers/task-manager/TaskManagerProvider";

import {
  getSelectedOption,
  toProjectSelectOptions,
  toSiteSelectOptions,
  toWebsiteSelectOptions,
} from "./selectOptions";

export type WebsiteMapping = {
  id: string;
  websiteId: string;
  siteId: string;
  projectKey: string;
  /** Populated from Jira when a project is selected; required for save. */
  jiraProjectId: string;
  jiraProjectName?: string;
};

type MappingCardProps = {
  mapping: WebsiteMapping;
  websites: SitecoreSite[];
  isWebsitesLoading: boolean;
  mappedWebsites: Set<string>;
  onChange: (
    mappingId: string,
    field: "websiteId" | "siteId" | "projectKey",
    value: string,
    jiraProject?: { id: string; name: string } | null,
  ) => void;
  onDelete: (mappingId: string) => void;
};

export default function MappingCard({
  mapping,
  websites,
  isWebsitesLoading,
  mappedWebsites,
  onChange,
  onDelete,
}: MappingCardProps) {
  const { sites, sitesLoading: isJiraSitesLoading } = useTaskManager();
  const { data: projects = [], isLoading: isProjectsLoading } = useJiraProjects(
    mapping.siteId || "",
  );
  const websiteOptions = toWebsiteSelectOptions(websites, mappedWebsites);
  const siteOptions = toSiteSelectOptions(sites);
  const projectOptions = toProjectSelectOptions(projects);

  const selectedWebsite = getSelectedOption(websiteOptions, mapping.websiteId);
  const selectedSite = getSelectedOption(siteOptions, mapping.siteId);
  const selectedProject = getSelectedOption(projectOptions, mapping.projectKey);

  return (
    <div
      key={mapping.id}
      className="relative rounded-md border bg-slate-50 p-3"
      data-testid="mapping-box"
    >
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
          <Icon path={mdiDeleteOutline} size={0.85} />
        </Button>

        <div className="w-full" data-testid="mapping-website">
          <SelectReact
            options={websiteOptions}
            value={selectedWebsite}
            isLoading={isWebsitesLoading}
            onChange={(option) => {
              if (option) onChange(mapping.id, "websiteId", option.value);
            }}
            placeholder="Select website"
            aria-label="Website"
          />
        </div>
      </div>

      <Icon path={mdiChevronDown} className="mx-auto my-1 size-5" />

      <div className="mb-2" data-testid="mapping-site">
        <SelectReact
          options={siteOptions}
          value={selectedSite}
          isLoading={isJiraSitesLoading}
          onChange={(option) => {
            if (option) onChange(mapping.id, "siteId", option.value);
          }}
          placeholder="Select Jira site"
          aria-label="Jira site"
        />
      </div>

      <div data-testid="mapping-project">
        <SelectReact
          options={projectOptions}
          value={selectedProject}
          isLoading={isProjectsLoading}
          onChange={(option) => {
            if (option) {
              const p = projects.find((proj) => proj.key === option.value);
              onChange(
                mapping.id,
                "projectKey",
                option.value,
                p ? { id: p.id, name: p.name } : null,
              );
            }
          }}
          placeholder="Select Jira project"
          aria-label="Jira project"
          isDisabled={!mapping.siteId || isProjectsLoading}
        />
      </div>
    </div>
  );
}
