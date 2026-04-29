"use client";

import { mdiPlus, mdiWeb } from "@mdi/js";
import axios from "axios";
import { useState } from "react";
import { toast } from "sonner";

import DefaultsPicker from "@/components/setup-wizard/DefaultsPicker";
import MappingCard, { WebsiteMapping } from "@/components/setup-wizard/MappingCard";
import { Button } from "@/components/ui/button";
import { Spinner } from "@/components/ui/spinner";
import { useCompleteSetup } from "@/hooks/useCompleteSetup";
import { useJiraProjects } from "@/hooks/useJiraProjects";
import { useSitecoreSites } from "@/hooks/useSitecoreSites";
import { useUpsertSetup } from "@/hooks/useUpsertSetup";
import { useUpsertSetupMappings } from "@/hooks/useUpsertSetupMappings";
import { Icon } from "@/lib/icon";
import { useTaskManager } from "@/providers/task-manager/TaskManagerProvider";

import { Alert, AlertDescription, AlertTitle } from "../ui/alert";

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

export default function SetupWizard() {
  const [step, setStep] = useState<1 | 2>(1);
  const [isEditingDefaultsStep2, setIsEditingDefaultsStep2] = useState(false);
  const [isSubmittingStep1, setIsSubmittingStep1] = useState(false);
  const [isSubmittingStep2, setIsSubmittingStep2] = useState(false);

  const { sites: jiraSites } = useTaskManager();
  const { sites: sitecoreSites, isLoading: isSitecoreSitesLoading } = useSitecoreSites();
  const [defaultSiteId, setDefaultSiteId] = useState<string | null>(null);
  const [defaultProjectKey, setDefaultProjectKey] = useState<string | null>(null);

  const [mappings, setMappings] = useState<WebsiteMapping[]>([]);

  const { data: defaultSiteProjects = [], isLoading: isDefaultProjectsLoading } = useJiraProjects(
    defaultSiteId || "",
  );

  const upsertSetup = useUpsertSetup();
  const upsertMappings = useUpsertSetupMappings();
  const completeSetup = useCompleteSetup();

  const canContinue = Boolean(defaultSiteId && defaultProjectKey);
  const canSaveSetup =
    canContinue &&
    !isDefaultProjectsLoading &&
    Boolean(defaultSiteProjects.find((p) => p.key === defaultProjectKey));
  const usedWebsiteIds = new Set(mappings.map((mapping) => mapping.websiteId));
  const hasIncompleteMappings = mappings.some(
    (mapping) =>
      !mapping.websiteId || !mapping.siteId || !mapping.projectKey || !mapping.jiraProjectId,
  );
  const noAvailableWebsites =
    sitecoreSites.find((website) => !usedWebsiteIds.has(website.id)) === undefined;
  const disableAddMapping = !canContinue || noAvailableWebsites;

  const isAnyMutationPending =
    upsertSetup.isPending || upsertMappings.isPending || completeSetup.isPending;

  const buildUpsertSetupBody = () => {
    if (!defaultSiteId || !defaultProjectKey) return null;
    const jiraSite = jiraSites.find((s) => s.id === defaultSiteId);
    const project = defaultSiteProjects.find((p) => p.key === defaultProjectKey);
    if (!jiraSite || !project) return null;
    return {
      jiraSiteId: jiraSite.id,
      jiraSiteUrl: jiraSite.url,
      jiraSiteName: jiraSite.name,
      defaultProjectId: project.id,
      defaultProjectKey: project.key,
      defaultProjectName: project.name,
    };
  };

  const runUpsertSetup = async () => {
    const body = buildUpsertSetupBody();
    if (!body) {
      throw new Error("Could not resolve the default Jira site or project.");
    }
    await upsertSetup.mutateAsync(body);
  };

  const handleGetStartedStep1 = async () => {
    if (!canSaveSetup || isSubmittingStep1) return;
    setIsSubmittingStep1(true);
    try {
      await runUpsertSetup();
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

  const buildMappingsPayload = () => {
    return mappings.map((m) => {
      const jiraSite = jiraSites.find((s) => s.id === m.siteId);
      const website = sitecoreSites.find((w) => w.id === m.websiteId);
      const saiName = website?.name ?? website?.displayName;
      return {
        saiSiteId: m.websiteId,
        ...(saiName != null && saiName !== "" ? { saiSiteName: saiName } : {}),
        jiraSiteId: m.siteId,
        jiraSiteUrl: jiraSite?.url,
        jiraSiteName: jiraSite?.name,
        jiraProjectId: m.jiraProjectId,
        jiraProjectKey: m.projectKey,
        jiraProjectName: m.jiraProjectName,
      };
    });
  };

  const handleGetStartedStep2 = async () => {
    if (!canSaveSetup || hasIncompleteMappings || isSubmittingStep2) return;
    setIsSubmittingStep2(true);
    try {
      await runUpsertSetup();
      await upsertMappings.mutateAsync({ mappings: buildMappingsPayload() });
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

  const handleDefaultProjectChange = (projectKey: string) => {
    setDefaultProjectKey(projectKey);
  };

  const handleAddMapping = () => {
    const usedWebsites = new Set(mappings.map((mapping) => mapping.websiteId));
    const firstAvailableWebsite =
      sitecoreSites.find((website) => !usedWebsites.has(website.id))?.id ??
      sitecoreSites[0]?.id ??
      "";

    const nextMappings: WebsiteMapping[] = [
      ...mappings,
      {
        id: crypto.randomUUID(),
        websiteId: firstAvailableWebsite,
        siteId: "",
        projectKey: "",
        jiraProjectId: "",
      },
    ];
    setMappings(nextMappings);
  };

  const handleMappingChange = (
    mappingId: string,
    field: "websiteId" | "siteId" | "projectKey",
    value: string,
    jiraProject?: { id: string; name: string } | null,
  ) => {
    setMappings(
      mappings.map((mapping) => {
        if (mapping.id !== mappingId) return mapping;
        if (field === "siteId") {
          return { ...mapping, siteId: value, projectKey: "", jiraProjectId: "" };
        }
        if (field === "projectKey") {
          return {
            ...mapping,
            projectKey: value,
            jiraProjectId: jiraProject?.id ?? "",
            jiraProjectName: jiraProject?.name,
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
              <AlertTitle>Jira connected successfully</AlertTitle>
              <AlertDescription>Please choose a default Jira project to continue.</AlertDescription>
            </Alert>

            <DefaultsPicker
              selectedSiteId={defaultSiteId}
              selectedProjectKey={defaultProjectKey}
              onSiteChange={handleDefaultSiteChange}
              onProjectChange={handleDefaultProjectChange}
              siteTestId="wizard-step1-site"
              projectTestId="wizard-step1-project"
            />

            <div className="mt-auto flex w-full flex-col gap-3 py-4">
              <Button
                data-testid="wizard-get-started"
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
                data-testid="wizard-go-to-mapping"
                disabled={!canSaveSetup || isAnyMutationPending || isSubmittingStep1}
                onClick={handleGoToStep2}
              >
                <Icon path={mdiWeb} size={0.8} />
                Map Projects to Websites
              </Button>
            </div>
          </>
        )}

        {step === 2 && (
          <>
            <DefaultsPicker
              selectedSiteId={defaultSiteId}
              selectedProjectKey={defaultProjectKey}
              onSiteChange={handleDefaultSiteChange}
              onProjectChange={handleDefaultProjectChange}
              siteTestId="wizard-step2-site"
              projectTestId="wizard-step2-project"
              readOnly={!isEditingDefaultsStep2}
              onToggleEdit={() => setIsEditingDefaultsStep2((prev) => !prev)}
            />

            <div className="space-y-4">
              <p className="text-muted-foreground text-xs font-bold uppercase">Website Mappings</p>
              {mappings.length !== 0 && (
                <div className="space-y-2">
                  {mappings.map((mapping) => {
                    const mappedWebsites = new Set(
                      mappings
                        .filter((item) => item.id !== mapping.id)
                        .map((item) => item.websiteId),
                    );

                    return (
                      <MappingCard
                        key={mapping.id}
                        mapping={mapping}
                        websites={sitecoreSites}
                        isWebsitesLoading={isSitecoreSitesLoading}
                        mappedWebsites={mappedWebsites}
                        onChange={handleMappingChange}
                        onDelete={handleDeleteMapping}
                      />
                    );
                  })}
                </div>
              )}
              <Button
                variant={"outline"}
                data-testid="wizard-add-mapping"
                onClick={handleAddMapping}
                className="w-full"
                disabled={disableAddMapping || isSubmittingStep2 || isAnyMutationPending}
              >
                <Icon path={mdiPlus} size={0.8} />
                Add mapping
              </Button>
            </div>

            <div className="mt-auto flex w-full flex-col gap-3 py-4">
              <Button
                data-testid="wizard-get-started-step2"
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
                data-testid="wizard-back-step1"
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
