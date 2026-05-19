"use client";

import { mdiChevronDown, mdiChevronUp } from "@mdi/js";
import { useEffect, useRef, useState } from "react";
import { toast } from "sonner";

import SiteMappingRow, { type SiteMappingState } from "@/components/connections/SiteMappingRow";
import { Skeleton } from "@/components/ui/skeleton";
import { useSetupMappings } from "@/hooks/useSetupMappings";
import { type SitecoreSite, useSitecoreSites } from "@/hooks/useSitecoreSites";
import { useUpsertSetupMappings } from "@/hooks/useUpsertSetupMappings";
import { Icon } from "@/lib/icon";
import { useTaskManager } from "@/providers/task-manager/TaskManagerProvider";
import type { JiraSiteProjectMapping } from "@/types/setup";

import { Button } from "../ui/button";

function buildInitialMappings(
  sitecoreSites: SitecoreSite[],
  savedMappings: JiraSiteProjectMapping[],
): { localMappings: Record<string, SiteMappingState>; collapsedRows: Set<string> } {
  const localMappings: Record<string, SiteMappingState> = {};
  const collapsedRows = new Set<string>();

  for (const site of sitecoreSites) {
    const saved = savedMappings.find((m) => m.sai_site_id === site.id);
    if (saved) {
      localMappings[site.id] = {
        useDefault: false,
        jiraSiteId: saved.jira_site_id ?? "",
        jiraProjectKey: saved.jira_project_key,
        jiraProjectId: saved.jira_project_id,
        jiraProjectName: saved.jira_project_name ?? undefined,
      };
      collapsedRows.add(site.id);
    } else {
      localMappings[site.id] = {
        useDefault: true,
        jiraSiteId: "",
        jiraProjectKey: "",
        jiraProjectId: "",
      };
    }
  }

  return { localMappings, collapsedRows };
}

function buildMappingsPayload(
  sitecoreSites: SitecoreSite[],
  jiraSites: Array<{ id: string; url: string; name: string }>,
  localMappings: Record<string, SiteMappingState>,
) {
  return sitecoreSites
    .filter((site) => {
      const m = localMappings[site.id];
      return m && !m.useDefault && m.jiraProjectId && m.jiraProjectKey;
    })
    .map((site) => {
      const m = localMappings[site.id]!;
      const jiraSite = jiraSites.find((s) => s.id === m.jiraSiteId);
      const saiName = site.name || site.displayName;
      return {
        saiSiteId: site.id,
        ...(saiName ? { saiSiteName: saiName } : {}),
        ...(m.jiraSiteId ? { jiraSiteId: m.jiraSiteId } : {}),
        ...(jiraSite?.url ? { jiraSiteUrl: jiraSite.url } : {}),
        ...(jiraSite?.name ? { jiraSiteName: jiraSite.name } : {}),
        jiraProjectId: m.jiraProjectId,
        jiraProjectKey: m.jiraProjectKey,
        ...(m.jiraProjectName ? { jiraProjectName: m.jiraProjectName } : {}),
      };
    });
}

type MappingData = {
  localMappings: Record<string, SiteMappingState>;
  collapsedRows: Set<string>;
};

export default function WebsiteMappingsSection() {
  const { sites: jiraSites, pageContext, hasMultipleSites } = useTaskManager();
  const { sites: sitecoreSites, isLoading: isSitecoreSitesLoading } = useSitecoreSites();
  const { data: savedMappings = [], isLoading: isMappingsLoading } = useSetupMappings();
  const { mutate: upsertMappings, isPending: isSaving } = useUpsertSetupMappings();

  const [isSectionOpen, setIsSectionOpen] = useState(true);
  const [{ localMappings, collapsedRows }, setMappingData] = useState<MappingData>({
    localMappings: {},
    collapsedRows: new Set<string>(),
  });
  const isInitialized = useRef(false);

  const currentSiteName = pageContext.siteInfo?.name;

  useEffect(() => {
    if (isMappingsLoading || isSitecoreSitesLoading || isInitialized.current) return;
    isInitialized.current = true;
    const init = buildInitialMappings(sitecoreSites, savedMappings);
    void Promise.resolve().then(() => setMappingData(init));
  }, [savedMappings, sitecoreSites, isMappingsLoading, isSitecoreSitesLoading]);

  const updateMapping = (
    siteId: string,
    patch: Partial<SiteMappingState>,
    options?: { save?: boolean },
  ) => {
    const updated = {
      ...localMappings,
      [siteId]: { ...localMappings[siteId]!, ...patch },
    };
    setMappingData((prev) => ({ ...prev, localMappings: updated }));
    if (options?.save) {
      upsertMappings(
        { mappings: buildMappingsPayload(sitecoreSites, jiraSites, updated) },
        { onError: () => toast.error("Failed to save website mappings.") },
      );
    }
  };

  const setRowCollapsed = (siteId: string, collapsed: boolean) => {
    setMappingData((prev) => {
      const next = new Set(prev.collapsedRows);
      if (collapsed) next.add(siteId);
      else next.delete(siteId);
      return { ...prev, collapsedRows: next };
    });
  };

  const isLoading = isSitecoreSitesLoading || isMappingsLoading;

  return (
    <div className="space-y-2" data-testid="website-mappings-section">
      <div className="flex items-center justify-between">
        <h5 className="text-sm font-medium">Website Mappings</h5>
        <Button
          type="button"
          variant="ghost"
          colorScheme="neutral"
          size="icon-sm"
          onClick={() => setIsSectionOpen((prev) => !prev)}
          className="text-muted-foreground hover:text-foreground rounded transition-colors"
          aria-label={isSectionOpen ? "Collapse website mappings" : "Expand website mappings"}
          data-testid="website-mappings-section-toggle"
        >
          <Icon path={isSectionOpen ? mdiChevronUp : mdiChevronDown} className="size-4" />
        </Button>
      </div>

      {isSectionOpen && (
        <>
          {isLoading && (
            <div className="space-y-2">
              <Skeleton className="h-12 w-full rounded-md" />
              <Skeleton className="h-12 w-full rounded-md" />
            </div>
          )}

          {!isLoading && sitecoreSites.length === 0 && (
            <p className="text-muted-foreground text-sm">No SitecoreAI sites found.</p>
          )}

          {!isLoading && sitecoreSites.length > 0 && (
            <div className="space-y-2">
              {sitecoreSites.map((site) => {
                const mapping: SiteMappingState = localMappings[site.id] ?? {
                  useDefault: true,
                  jiraSiteId: "",
                  jiraProjectKey: "",
                  jiraProjectId: "",
                };

                return (
                  <SiteMappingRow
                    key={site.id}
                    site={site}
                    mapping={mapping}
                    isSaving={isSaving}
                    isCurrent={!!currentSiteName && site.name === currentSiteName}
                    isCollapsed={collapsedRows.has(site.id)}
                    onToggleCollapse={() => setRowCollapsed(site.id, !collapsedRows.has(site.id))}
                    onToggleUseDefault={(useDefault) => {
                      if (useDefault) {
                        const hadMapping = !mapping.useDefault && !!mapping.jiraProjectId;
                        updateMapping(
                          site.id,
                          {
                            useDefault: true,
                            jiraSiteId: "",
                            jiraProjectKey: "",
                            jiraProjectId: "",
                          },
                          { save: hadMapping },
                        );
                      } else {
                        updateMapping(site.id, {
                          useDefault: false,
                          ...(!hasMultipleSites && jiraSites[0]
                            ? { jiraSiteId: jiraSites[0].id, jiraProjectKey: "", jiraProjectId: "" }
                            : {}),
                        });
                        setRowCollapsed(site.id, false);
                      }
                    }}
                    onSiteChange={(jiraSiteId) => {
                      updateMapping(site.id, { jiraSiteId, jiraProjectKey: "", jiraProjectId: "" });
                    }}
                    onProjectChange={(jiraProjectKey, jiraProjectId, jiraProjectName) => {
                      updateMapping(
                        site.id,
                        { jiraProjectKey, jiraProjectId, jiraProjectName },
                        { save: true },
                      );
                    }}
                  />
                );
              })}
            </div>
          )}
        </>
      )}
    </div>
  );
}
