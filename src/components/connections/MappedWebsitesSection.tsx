"use client";

import { mdiCheckCircleOutline, mdiChevronDown, mdiCircleOutline } from "@mdi/js";
import { useQueryClient } from "@tanstack/react-query";
import axios from "axios";
import { useState } from "react";
import { toast } from "sonner";

import { Button } from "@/components/ui/button";
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from "@/components/ui/collapsible";
import { SelectReact } from "@/components/ui/select-react";
import { Spinner } from "@/components/ui/spinner";
import { useJiraProjects } from "@/hooks/useJiraProjects";
import { SETUP_QUERY_KEY, useSetup } from "@/hooks/useSetup";
import { type SitecoreSite, useSitecoreSites } from "@/hooks/useSitecoreSites";
import { useUpsertSetupMappings } from "@/hooks/useUpsertSetupMappings";
import { Icon } from "@/lib/icon";
import { cn } from "@/lib/utils";
import { useTaskManager } from "@/providers/task-manager/TaskManagerProvider";
import type { JiraSite } from "@/types/jira";
import type { JiraSiteProjectMapping, SetupResponse, UpsertMappingItem } from "@/types/setup";

import {
  getSelectedOption,
  toProjectSelectOptions,
  toSiteSelectOptions,
} from "../setup-wizard/selectOptions";

function parseApiErrorMessage(error: unknown): string {
  if (
    axios.isAxiosError(error) &&
    error.response?.data &&
    typeof error.response.data === "object"
  ) {
    const d = error.response.data as { error?: unknown };
    if (typeof d.error === "string" && d.error) return d.error;
  }
  if (error instanceof Error) return error.message;
  return "Request failed.";
}

function toUpsertItem(m: JiraSiteProjectMapping): UpsertMappingItem {
  return {
    saiSiteId: m.sai_site_id,
    saiSiteName: m.sai_site_name ?? undefined,
    jiraSiteId: m.jira_site_id ?? undefined,
    jiraSiteUrl: m.jira_site_url ?? undefined,
    jiraSiteName: m.jira_site_name ?? undefined,
    jiraProjectId: m.jira_project_id,
    jiraProjectKey: m.jira_project_key,
    jiraProjectName: m.jira_project_name ?? undefined,
  };
}

/**
 * Replaces a site's entry (or omits it when newItem is null) while keeping all other DB mappings.
 */
function mergeMappings(
  fromDb: JiraSiteProjectMapping[] | undefined,
  saiSiteId: string,
  newItem: UpsertMappingItem | null,
): UpsertMappingItem[] {
  const others = (fromDb ?? []).filter((m) => m.sai_site_id !== saiSiteId).map(toUpsertItem);
  if (!newItem) return others;
  return [...others, newItem];
}

type SiteMappingRowProps = {
  site: SitecoreSite;
  jiraSites: JiraSite[];
  jiraSitesLoading: boolean;
  existing: JiraSiteProjectMapping | undefined;
  onUseDefault: () => void;
  onCustomMapping: (item: UpsertMappingItem) => void;
  isSaving: boolean;
};

function SiteMappingRow({
  site,
  jiraSites,
  jiraSitesLoading,
  existing,
  onUseDefault,
  onCustomMapping,
  isSaving,
}: SiteMappingRowProps) {
  /** true while no DB mapping: user is still "use default" until they uncheck to add a custom one */
  const [wantsCustomOverride, setWantsCustomOverride] = useState(false);

  const useDefaultSelected = !existing && !wantsCustomOverride;
  const showDropdowns = !useDefaultSelected;

  const [jiraCloudId, setJiraCloudId] = useState(() => existing?.jira_site_id ?? "");
  const [projectKey, setProjectKey] = useState(() => existing?.jira_project_key ?? "");

  const { data: projects = [], isLoading: projectsLoading } = useJiraProjects(
    showDropdowns && jiraCloudId ? jiraCloudId : "",
  );

  const siteOptions = toSiteSelectOptions(jiraSites);
  const projectOptions = toProjectSelectOptions(projects);
  const selectedJira = getSelectedOption(siteOptions, jiraCloudId || null);
  const selectedProject = getSelectedOption(projectOptions, projectKey || null);

  const onUseDefaultToggle = (toDefault: boolean) => {
    if (toDefault) {
      setWantsCustomOverride(false);
      setJiraCloudId("");
      setProjectKey("");
      if (existing) onUseDefault();
    } else {
      setWantsCustomOverride(true);
    }
  };

  const tryPersist = (nextCloud: string, nextKey: string) => {
    if (!nextCloud || !nextKey) return;
    const jiraMeta = jiraSites.find((s) => s.id === nextCloud);
    const jiraProject = projects.find((p) => p.key === nextKey);
    if (!jiraMeta || !jiraProject) return;

    const label = site.name?.trim() || site.displayName?.trim();
    onCustomMapping({
      saiSiteId: site.id,
      ...(label ? { saiSiteName: label } : {}),
      jiraSiteId: jiraMeta.id,
      jiraSiteUrl: jiraMeta.url,
      jiraSiteName: jiraMeta.name,
      jiraProjectId: jiraProject.id,
      jiraProjectKey: jiraProject.key,
      jiraProjectName: jiraProject.name,
    });
  };

  return (
    <div
      className="space-y-3 rounded-md border bg-slate-50/80 p-3"
      data-testid={`mapped-website-card-${site.id}`}
    >
      <div className="flex flex-row items-center justify-between gap-2">
        <p className="text-sm font-medium">{site.displayName}</p>
        <div className="flex items-center gap-2">
          <Button
            type="button"
            size="xs"
            variant={useDefaultSelected ? "default" : "outline"}
            colorScheme={useDefaultSelected ? "primary" : "neutral"}
            disabled={isSaving}
            onClick={() => onUseDefaultToggle(!useDefaultSelected)}
            aria-pressed={useDefaultSelected}
            aria-label={useDefaultSelected ? "Use default (on)" : "Use default (off)"}
            data-testid={`use-default-${site.id}`}
          >
            <Icon path={useDefaultSelected ? mdiCheckCircleOutline : mdiCircleOutline} />
            Use default
          </Button>
        </div>
      </div>

      {showDropdowns && (
        <div className="space-y-2">
          <div data-testid={`${site.id}-jira-site`}>
            <SelectReact
              options={siteOptions}
              value={selectedJira}
              isLoading={jiraSitesLoading}
              isDisabled={isSaving}
              onChange={(option) => {
                if (!option) return;
                setJiraCloudId(option.value);
                setProjectKey("");
              }}
              placeholder="Select Jira site"
              aria-label="Jira site"
              size="sm"
            />
          </div>
          <div data-testid={`${site.id}-jira-project`}>
            <SelectReact
              options={projectOptions}
              value={selectedProject}
              isLoading={projectsLoading}
              isDisabled={isSaving || !jiraCloudId || projectsLoading}
              onChange={(option) => {
                if (!option) return;
                setProjectKey(option.value);
                tryPersist(jiraCloudId, option.value);
              }}
              placeholder="Select Jira project"
              aria-label="Jira project"
              size="sm"
            />
          </div>
        </div>
      )}
    </div>
  );
}

export function MappedWebsitesSection() {
  const queryClient = useQueryClient();
  const { sites: jiraSites, sitesLoading: jiraSitesLoading } = useTaskManager();
  const { sites: sitecoreSites, isLoading: scLoading, error: scError } = useSitecoreSites();
  const { data: setupData, isLoading: setupLoading, error: setupError } = useSetup();
  const upsert = useUpsertSetupMappings();
  const isLoading = scLoading || setupLoading;

  const persist = (saiSiteId: string, newItem: UpsertMappingItem | null) => {
    const current = queryClient.getQueryData<SetupResponse>(SETUP_QUERY_KEY);
    const next = mergeMappings(current?.mappings, saiSiteId, newItem);
    upsert.mutate(
      { mappings: next },
      {
        onError: (e) => toast.error(parseApiErrorMessage(e)),
      },
    );
  };

  if (isLoading) {
    return (
      <div className="text-muted-foreground flex items-center gap-2 text-sm">
        <Spinner className="size-4" />
        Loading sites…
      </div>
    );
  }

  if (scError) {
    return <p className="text-destructive text-sm">{scError.message}</p>;
  }

  if (setupError) {
    return <p className="text-destructive text-sm">Could not load mappings.</p>;
  }

  return (
    <>
      <Collapsible defaultOpen data-testid="mapped-websites-section" className="group w-full">
        <CollapsibleTrigger
          className={cn(
            "flex w-full cursor-pointer items-center justify-between gap-2 rounded-md text-left text-sm font-medium transition-colors",
            "focus-visible:border-ring focus-visible:ring-ring/50 outline-none focus-visible:ring-[3px]",
          )}
          type="button"
          aria-label="Toggle mapped websites"
        >
          <span>Mapped websites</span>
          <Icon
            path={mdiChevronDown}
            className="text-muted-foreground size-5 shrink-0 transition-transform duration-200 group-data-[state=open]:rotate-180"
          />
        </CollapsibleTrigger>
        <CollapsibleContent className="data-[state=closed]:animate-accordion-up data-[state=open]:animate-accordion-down overflow-hidden pt-2">
          {sitecoreSites.length === 0 ? (
            <p className="text-muted-foreground text-sm">No Sitecore sites available.</p>
          ) : (
            <ul className="list-none space-y-2">
              {sitecoreSites.map((site) => {
                const rowExisting = setupData?.mappings?.find((m) => m.sai_site_id === site.id);
                return (
                  <li key={site.id}>
                    <SiteMappingRow
                      key={`${site.id}-${rowExisting?.id ?? "unmapped"}`}
                      site={site}
                      jiraSites={jiraSites}
                      jiraSitesLoading={jiraSitesLoading}
                      existing={rowExisting}
                      onUseDefault={() => persist(site.id, null)}
                      onCustomMapping={(item) => persist(site.id, item)}
                      isSaving={upsert.isPending}
                    />
                  </li>
                );
              })}
            </ul>
          )}
        </CollapsibleContent>
      </Collapsible>

      <div className="pt-1">
        <Button
          onClick={() => {
            // Temporary dev helper: remove when no longer needed.
            console.log("[dev] useSetup data", setupData);
          }}
        >
          Log setup
        </Button>
      </div>
    </>
  );
}
