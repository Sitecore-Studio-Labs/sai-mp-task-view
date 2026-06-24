"use client";

import type { PlatformExternalResource } from "@mp/task-core";
import { useTaskManager } from "@mp/task-core";
import axios from "axios";
import { useEffect, useMemo, useState } from "react";
import { toast } from "sonner";

import { usePlatformSetupMappings } from "../../hooks/usePlatformSetupMappings";
import { useSitecoreSites } from "../../hooks/useSitecoreSites";
import { useUpsertPlatformSetupMappings } from "../../hooks/useUpsertPlatformSetupMappings";
import { Button } from "../ui/button";
import { Spinner } from "../ui/spinner";
import {
  type PlatformSetupDraftMapping,
  PlatformSetupMappingCard,
} from "./PlatformSetupMappingCard";

type UseExternalResourcesResult = {
  resources: PlatformExternalResource[];
  isLoading: boolean;
};

export type PlatformSetupMappingsEditorProps = {
  externalResourceLabel?: string;
  title?: string;
  useExternalResources?: () => UseExternalResourcesResult;
};

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

function useDefaultExternalResources(): UseExternalResourcesResult {
  const { sites, isLoading } = useSitecoreSites();
  return { resources: sites, isLoading };
}

export function PlatformSetupMappingsEditor({
  externalResourceLabel = "Website",
  title = "Project mappings",
  useExternalResources = useDefaultExternalResources,
}: PlatformSetupMappingsEditorProps) {
  const { sites } = useTaskManager();
  const { resources: externalResources, isLoading: isExternalResourcesLoading } =
    useExternalResources();
  const { data: savedMappings = [], isLoading: isMappingsLoading } = usePlatformSetupMappings();
  const upsertMappings = useUpsertPlatformSetupMappings();
  const [mappings, setMappings] = useState<PlatformSetupDraftMapping[]>([]);
  const [isDirty, setIsDirty] = useState(false);

  useEffect(() => {
    if (isDirty) return;

    setMappings(
      savedMappings.map((mapping) => ({
        id: mapping.id,
        externalResourceId: mapping.externalResourceId,
        siteId: mapping.siteId ?? "",
        projectKey: mapping.projectKey,
        projectId: mapping.projectId,
        projectName: mapping.projectName ?? undefined,
      })),
    );
  }, [isDirty, savedMappings]);

  const usedExternalResourceIds = useMemo(
    () => new Set(mappings.map((mapping) => mapping.externalResourceId)),
    [mappings],
  );
  const noAvailableExternalResources =
    externalResources.find((resource) => !usedExternalResourceIds.has(resource.id)) === undefined;
  const hasIncompleteMappings = mappings.some(
    (mapping) =>
      !mapping.externalResourceId || !mapping.siteId || !mapping.projectKey || !mapping.projectId,
  );

  const handleAddMapping = () => {
    const firstAvailableResource =
      externalResources.find((resource) => !usedExternalResourceIds.has(resource.id))?.id ??
      externalResources[0]?.id ??
      "";
    setMappings((current) => [
      ...current,
      {
        id: crypto.randomUUID(),
        externalResourceId: firstAvailableResource,
        siteId: "",
        projectKey: "",
        projectId: "",
      },
    ]);
    setIsDirty(true);
  };

  const handleMappingChange = (
    mappingId: string,
    field: "externalResourceId" | "siteId" | "projectKey",
    value: string,
    project?: { id: string; name: string } | null,
  ) => {
    setMappings((current) =>
      current.map((mapping) => {
        if (mapping.id !== mappingId) return mapping;
        if (field === "siteId") return { ...mapping, siteId: value, projectKey: "", projectId: "" };
        if (field === "projectKey") {
          return {
            ...mapping,
            projectKey: value,
            projectId: project?.id ?? "",
            projectName: project?.name,
          };
        }
        return { ...mapping, [field]: value };
      }),
    );
    setIsDirty(true);
  };

  const handleDeleteMapping = (mappingId: string) => {
    setMappings((current) => current.filter((mapping) => mapping.id !== mappingId));
    setIsDirty(true);
  };

  const handleReset = () => {
    setMappings(
      savedMappings.map((mapping) => ({
        id: mapping.id,
        externalResourceId: mapping.externalResourceId,
        siteId: mapping.siteId ?? "",
        projectKey: mapping.projectKey,
        projectId: mapping.projectId,
        projectName: mapping.projectName ?? undefined,
      })),
    );
    setIsDirty(false);
  };

  const handleSave = async () => {
    try {
      await upsertMappings.mutateAsync({
        mappings: mappings.map((mapping) => {
          const site = sites.find((item) => item.id === mapping.siteId);
          const resource = externalResources.find((item) => item.id === mapping.externalResourceId);
          const externalResourceName = resource?.name ?? resource?.displayName;
          return {
            externalResourceId: mapping.externalResourceId,
            ...(externalResourceName ? { externalResourceName } : {}),
            siteId: mapping.siteId,
            siteUrl: site?.url,
            siteName: site?.name,
            projectId: mapping.projectId,
            projectKey: mapping.projectKey,
            projectName: mapping.projectName,
          };
        }),
      });
      setIsDirty(false);
      toast.success("Project mappings saved.");
    } catch (error) {
      toast.error(parseApiErrorMessage(error));
    }
  };

  return (
    <div className="space-y-3">
      <div className="flex items-center justify-between gap-3">
        <div>
          <h5 className="text-sm font-medium">{title}</h5>
          <p className="text-muted-foreground text-xs">
            Override the default project for specific {externalResourceLabel.toLowerCase()}s.
          </p>
        </div>
        {isDirty && (
          <Button
            type="button"
            variant="ghost"
            colorScheme="neutral"
            size="sm"
            onClick={handleReset}
            disabled={upsertMappings.isPending}
          >
            Reset
          </Button>
        )}
      </div>

      {mappings.length === 0 ? (
        <p className="text-muted-foreground rounded-md border border-dashed px-3 py-2 text-sm">
          No overrides. The default project will be used.
        </p>
      ) : (
        <div className="space-y-2">
          {mappings.map((mapping) => {
            const mappedExternalResources = new Set(
              mappings
                .filter((item) => item.id !== mapping.id)
                .map((item) => item.externalResourceId),
            );
            return (
              <PlatformSetupMappingCard
                key={mapping.id}
                mapping={mapping}
                externalResources={externalResources}
                isExternalResourcesLoading={isExternalResourcesLoading || isMappingsLoading}
                mappedExternalResources={mappedExternalResources}
                externalResourceLabel={externalResourceLabel}
                onChange={handleMappingChange}
                onDelete={handleDeleteMapping}
              />
            );
          })}
        </div>
      )}

      <div className="flex gap-2">
        <Button
          type="button"
          variant="outline"
          colorScheme="neutral"
          className="flex-1 bg-white font-medium"
          onClick={handleAddMapping}
          disabled={noAvailableExternalResources || upsertMappings.isPending}
        >
          + Add mapping
        </Button>
        <Button
          type="button"
          className="flex-1"
          onClick={() => {
            void handleSave();
          }}
          disabled={!isDirty || hasIncompleteMappings || upsertMappings.isPending}
        >
          {upsertMappings.isPending ? (
            <>
              <Spinner className="size-4" />
              Saving...
            </>
          ) : (
            "Save mappings"
          )}
        </Button>
      </div>
    </div>
  );
}
