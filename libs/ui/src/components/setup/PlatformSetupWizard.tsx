"use client";

import { mdiWeb } from "@mdi/js";
import type { PlatformExternalResource } from "@mp/task-core";
import { usePlatformCapabilities, useTaskManager } from "@mp/task-core";
import axios from "axios";
import { useState } from "react";
import { toast } from "sonner";

import { useCompletePlatformSetup } from "../../hooks/useCompletePlatformSetup";
import { usePlatformProjects } from "../../hooks/usePlatformProjects";
import { useSitecoreSites } from "../../hooks/useSitecoreSites";
import { useUpsertPlatformSetup } from "../../hooks/useUpsertPlatformSetup";
import { useUpsertPlatformSetupMappings } from "../../hooks/useUpsertPlatformSetupMappings";
import { Alert, AlertDescription, AlertTitle } from "../ui/alert";
import { Button } from "../ui/button";
import { Icon } from "../ui/icon";
import { Spinner } from "../ui/spinner";
import { PlatformSetupDefaultsPicker } from "./PlatformSetupDefaultsPicker";
import {
  type PlatformSetupDraftMapping,
  PlatformSetupMappingCard,
} from "./PlatformSetupMappingCard";

type UseExternalResourcesResult = {
  resources: PlatformExternalResource[];
  isLoading: boolean;
};

export type PlatformSetupWizardProps = {
  externalResourceLabel?: string;
  mappingSectionTitle?: string;
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

export function PlatformSetupWizard({
  externalResourceLabel = "Website",
  mappingSectionTitle = "Website Mappings",
  useExternalResources = useDefaultExternalResources,
}: PlatformSetupWizardProps) {
  const { platformDisplayName } = usePlatformCapabilities();
  const [step, setStep] = useState<1 | 2>(1);
  const [isEditingDefaultsStep2, setIsEditingDefaultsStep2] = useState(false);
  const [isSubmittingStep1, setIsSubmittingStep1] = useState(false);
  const [isSubmittingStep2, setIsSubmittingStep2] = useState(false);

  const { sites } = useTaskManager();
  const { resources: externalResources, isLoading: isExternalResourcesLoading } =
    useExternalResources();
  const [defaultSiteId, setDefaultSiteId] = useState<string | null>(null);
  const [defaultProjectKey, setDefaultProjectKey] = useState<string | null>(null);
  const [mappings, setMappings] = useState<PlatformSetupDraftMapping[]>([]);

  const { data: defaultSiteProjects = [], isLoading: isDefaultProjectsLoading } =
    usePlatformProjects(defaultSiteId ?? "");

  const upsertSetup = useUpsertPlatformSetup();
  const upsertMappings = useUpsertPlatformSetupMappings();
  const completeSetup = useCompletePlatformSetup();

  const canContinue = Boolean(defaultSiteId && defaultProjectKey);
  const canSaveSetup =
    canContinue &&
    !isDefaultProjectsLoading &&
    Boolean(defaultSiteProjects.find((project) => project.key === defaultProjectKey));
  const usedExternalResourceIds = new Set(mappings.map((mapping) => mapping.externalResourceId));
  const hasIncompleteMappings = mappings.some(
    (mapping) =>
      !mapping.externalResourceId || !mapping.siteId || !mapping.projectKey || !mapping.projectId,
  );
  const noAvailableExternalResources =
    externalResources.find((resource) => !usedExternalResourceIds.has(resource.id)) === undefined;
  const disableAddMapping = !canContinue || noAvailableExternalResources;
  const isAnyMutationPending =
    upsertSetup.isPending || upsertMappings.isPending || completeSetup.isPending;

  const buildUpsertSetupBody = () => {
    if (!defaultSiteId || !defaultProjectKey) return null;
    const site = sites.find((item) => item.id === defaultSiteId);
    const project = defaultSiteProjects.find((item) => item.key === defaultProjectKey);
    if (!site || !project) return null;
    return {
      siteId: site.id,
      siteUrl: site.url,
      siteName: site.name,
      defaultProjectId: project.id,
      defaultProjectKey: project.key,
      defaultProjectName: project.name,
    };
  };

  const runUpsertSetup = async () => {
    const body = buildUpsertSetupBody();
    if (!body)
      throw new Error(`Could not resolve the default ${platformDisplayName} site or project.`);
    await upsertSetup.mutateAsync(body);
  };

  const handleGetStartedStep1 = async () => {
    if (!canSaveSetup || isSubmittingStep1) return;
    setIsSubmittingStep1(true);
    try {
      await runUpsertSetup();
      await upsertMappings.mutateAsync({ mappings: [] });
      await completeSetup.mutateAsync();
    } catch (e) {
      toast.error(parseApiErrorMessage(e));
    } finally {
      setIsSubmittingStep1(false);
    }
  };

  const handleGoToStep2 = () => {
    if (!canSaveSetup) return;
    setIsEditingDefaultsStep2(false);
    setStep(2);
  };

  const buildMappingsPayload = () => ({
    mappings: mappings.map((mapping) => {
      const site = sites.find((item) => item.id === mapping.siteId);
      const resource = externalResources.find((item) => item.id === mapping.externalResourceId);
      const externalResourceName = resource?.name ?? resource?.displayName;
      return {
        externalResourceId: mapping.externalResourceId,
        ...(externalResourceName != null && externalResourceName !== ""
          ? { externalResourceName }
          : {}),
        siteId: mapping.siteId,
        siteUrl: site?.url,
        siteName: site?.name,
        projectId: mapping.projectId,
        projectKey: mapping.projectKey,
        projectName: mapping.projectName,
      };
    }),
  });

  const handleGetStartedStep2 = async () => {
    if (!canSaveSetup || hasIncompleteMappings || isSubmittingStep2) return;
    setIsSubmittingStep2(true);
    try {
      await runUpsertSetup();
      await upsertMappings.mutateAsync(buildMappingsPayload());
      await completeSetup.mutateAsync();
    } catch (e) {
      toast.error(parseApiErrorMessage(e));
    } finally {
      setIsSubmittingStep2(false);
    }
  };

  const handleDefaultSiteChange = (siteId: string) => {
    setDefaultSiteId(siteId);
    setDefaultProjectKey(null);
  };

  const handleAddMapping = () => {
    const usedResources = new Set(mappings.map((mapping) => mapping.externalResourceId));
    const firstAvailableResource =
      externalResources.find((resource) => !usedResources.has(resource.id))?.id ??
      externalResources[0]?.id ??
      "";
    setMappings([
      ...mappings,
      {
        id: crypto.randomUUID(),
        externalResourceId: firstAvailableResource,
        siteId: "",
        projectKey: "",
        projectId: "",
      },
    ]);
  };

  const handleMappingChange = (
    mappingId: string,
    field: "externalResourceId" | "siteId" | "projectKey",
    value: string,
    project?: { id: string; name: string } | null,
  ) => {
    setMappings(
      mappings.map((mapping) => {
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
  };

  const handleDeleteMapping = (mappingId: string) => {
    setMappings(mappings.filter((mapping) => mapping.id !== mappingId));
  };

  return (
    <div className="wrapper">
      <div className="relative flex min-h-screen flex-col gap-4">
        {step === 1 && (
          <>
            <Alert variant="success">
              <AlertTitle>{platformDisplayName} connected successfully</AlertTitle>
              <AlertDescription>
                Please choose a default {platformDisplayName} project to continue.
              </AlertDescription>
            </Alert>

            <PlatformSetupDefaultsPicker
              selectedSiteId={defaultSiteId}
              selectedProjectKey={defaultProjectKey}
              onSiteChange={handleDefaultSiteChange}
              onProjectChange={setDefaultProjectKey}
              siteTestId="wizard-step1-site"
              projectTestId="wizard-step1-project"
            />

            <div className="mt-auto flex w-full flex-col gap-3 py-4">
              <Button
                data-testid="wizard-get-started"
                size="lg"
                className="text-inverse-text! w-full"
                disabled={!canSaveSetup || isAnyMutationPending || isSubmittingStep1}
                onClick={() => {
                  void handleGetStartedStep1();
                }}
              >
                {isSubmittingStep1 ? (
                  <>
                    <Spinner className="size-4" />
                    Getting started...
                  </>
                ) : (
                  "Get Started"
                )}
              </Button>
              <Button
                variant="outline"
                colorScheme="neutral"
                size="lg"
                data-testid="wizard-go-to-mapping"
                className="w-full bg-white font-medium"
                disabled={!canSaveSetup || isAnyMutationPending || isSubmittingStep1}
                onClick={handleGoToStep2}
              >
                <Icon path={mdiWeb} size={0.8} colorScheme="inherit" className="text-body-text" />
                Map Projects to {externalResourceLabel}s
              </Button>
            </div>
          </>
        )}

        {step === 2 && (
          <>
            <PlatformSetupDefaultsPicker
              selectedSiteId={defaultSiteId}
              selectedProjectKey={defaultProjectKey}
              onSiteChange={handleDefaultSiteChange}
              onProjectChange={setDefaultProjectKey}
              siteTestId="wizard-step2-site"
              projectTestId="wizard-step2-project"
              readOnly={!isEditingDefaultsStep2}
              onToggleEdit={() => setIsEditingDefaultsStep2((prev) => !prev)}
            />

            <div className="mt-6 space-y-4">
              <p className="text-muted-foreground text-xs font-bold tracking-wide uppercase">
                {mappingSectionTitle}
              </p>
              {mappings.length !== 0 && (
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
                        isExternalResourcesLoading={isExternalResourcesLoading}
                        mappedExternalResources={mappedExternalResources}
                        externalResourceLabel={externalResourceLabel}
                        onChange={handleMappingChange}
                        onDelete={handleDeleteMapping}
                      />
                    );
                  })}
                </div>
              )}
              <Button
                variant="outline"
                colorScheme="neutral"
                size="lg"
                data-testid="wizard-add-mapping"
                onClick={handleAddMapping}
                className="w-full bg-white font-medium"
                disabled={disableAddMapping || isSubmittingStep2 || isAnyMutationPending}
              >
                + Add mapping
              </Button>
            </div>

            <div className="mt-auto flex w-full flex-col gap-3 py-4">
              <Button
                data-testid="wizard-get-started-step2"
                size="lg"
                className="text-inverse-text! w-full"
                disabled={
                  !canSaveSetup ||
                  hasIncompleteMappings ||
                  isAnyMutationPending ||
                  isSubmittingStep2
                }
                onClick={() => {
                  void handleGetStartedStep2();
                }}
              >
                {isSubmittingStep2 ? (
                  <>
                    <Spinner className="size-4" />
                    Getting started...
                  </>
                ) : (
                  "Get started"
                )}
              </Button>
              <Button
                variant="outline"
                colorScheme="neutral"
                size="lg"
                data-testid="wizard-back-step1"
                className="w-full bg-white font-medium"
                disabled={isSubmittingStep2 || isAnyMutationPending}
                onClick={() => {
                  setStep(1);
                  setIsEditingDefaultsStep2(false);
                }}
              >
                Back
              </Button>
            </div>
          </>
        )}
      </div>
    </div>
  );
}
