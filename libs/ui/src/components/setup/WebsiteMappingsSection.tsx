"use client";

import { mdiChevronDown, mdiChevronUp } from "@mdi/js";
import type { PlatformSetupMapping } from "@mp/task-core";
import { useTaskManager } from "@mp/task-core";
import { useEffect, useRef, useState } from "react";
import { toast } from "sonner";

import { usePlatformSetupMappings } from "../../hooks/usePlatformSetupMappings";
import type { SitecoreSite } from "../../hooks/useSitecoreSites";
import { useSitecoreSites } from "../../hooks/useSitecoreSites";
import { useUpsertPlatformSetupMappings } from "../../hooks/useUpsertPlatformSetupMappings";
import { Button } from "../ui/button";
import { Icon } from "../ui/icon";
import { Skeleton } from "../ui/skeleton";
import SiteMappingRow, { type SiteMappingState } from "./SiteMappingRow";

function buildInitialMappings(
  sitecoreSites: SitecoreSite[],
  savedMappings: PlatformSetupMapping[],
): { localMappings: Record<string, SiteMappingState>; collapsedRows: Set<string> } {
  const localMappings: Record<string, SiteMappingState> = {};
  const collapsedRows = new Set<string>();

  for (const site of sitecoreSites) {
    const saved = savedMappings.find((m) => m.externalResourceId === site.id);
    if (saved) {
      localMappings[site.id] = {
        useDefault: false,
        platformSiteId: saved.siteId ?? "",
        projectKey: saved.projectKey,
        projectId: saved.projectId,
        projectName: saved.projectName ?? undefined,
      };
      collapsedRows.add(site.id);
    } else {
      localMappings[site.id] = {
        useDefault: true,
        platformSiteId: "",
        projectKey: "",
        projectId: "",
      };
    }
  }

  return { localMappings, collapsedRows };
}

function buildMappingsPayload(
  sitecoreSites: SitecoreSite[],
  platformSites: Array<{ id: string; url: string; name: string }>,
  localMappings: Record<string, SiteMappingState>,
) {
  return sitecoreSites
    .filter((site) => {
      const m = localMappings[site.id];
      return m && !m.useDefault && m.projectId && m.projectKey;
    })
    .map((site) => {
      const m = localMappings[site.id]!;
      const platformSite = platformSites.find((s) => s.id === m.platformSiteId);
      const externalResourceName = site.name || site.displayName;
      return {
        externalResourceId: site.id,
        ...(externalResourceName ? { externalResourceName } : {}),
        ...(m.platformSiteId ? { siteId: m.platformSiteId } : {}),
        ...(platformSite?.url ? { siteUrl: platformSite.url } : {}),
        ...(platformSite?.name ? { siteName: platformSite.name } : {}),
        projectId: m.projectId,
        projectKey: m.projectKey,
        ...(m.projectName ? { projectName: m.projectName } : {}),
      };
    });
}

type MappingData = {
  localMappings: Record<string, SiteMappingState>;
  collapsedRows: Set<string>;
};

export default function WebsiteMappingsSection() {
  const { sites: platformSites, pageContext } = useTaskManager();
  const { sites: sitecoreSites, isLoading: isSitecoreSitesLoading } = useSitecoreSites();
  const { data: savedMappings = [], isLoading: isMappingsLoading } = usePlatformSetupMappings();
  const { mutate: upsertMappings, isPending: isSaving } = useUpsertPlatformSetupMappings();

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
        { mappings: buildMappingsPayload(sitecoreSites, platformSites, updated) },
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
          <Icon
            path={isSectionOpen ? mdiChevronUp : mdiChevronDown}
            colorScheme="inherit"
            className="text-muted-foreground"
            size="sm"
            scale={1}
          />
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
                  platformSiteId: "",
                  projectKey: "",
                  projectId: "",
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
                        const hadMapping = !mapping.useDefault && !!mapping.projectId;
                        updateMapping(
                          site.id,
                          {
                            useDefault: true,
                            platformSiteId: "",
                            projectKey: "",
                            projectId: "",
                          },
                          { save: hadMapping },
                        );
                      } else {
                        updateMapping(site.id, { useDefault: false });
                        setRowCollapsed(site.id, false);
                      }
                    }}
                    onSiteChange={(platformSiteId) => {
                      updateMapping(site.id, { platformSiteId, projectKey: "", projectId: "" });
                    }}
                    onProjectChange={(projectKey, projectId, projectName) => {
                      updateMapping(
                        site.id,
                        { projectKey, projectId, projectName },
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
