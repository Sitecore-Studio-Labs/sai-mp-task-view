"use client";

import { mdiPlus, mdiWeb } from "@mdi/js";
import { useState } from "react";

import DefaultsPicker from "@/components/setup-wizard/DefaultsPicker";
import MappingCard, { WebsiteMapping } from "@/components/setup-wizard/MappingCard";
import { Button } from "@/components/ui/button";
import { useSitecoreSites } from "@/hooks/useSitecoreSites";
import { Icon } from "@/lib/icon";

import { Alert, AlertDescription, AlertTitle } from "../ui/alert";

export default function SetupWizard() {
  const [step, setStep] = useState<1 | 2>(1);
  const [isEditingDefaultsStep2, setIsEditingDefaultsStep2] = useState(false);

  const { sites: sitecoreSites, isLoading: isSitecoreSitesLoading } = useSitecoreSites();
  const [defaultSiteId, setDefaultSiteId] = useState<string | null>(null);
  const [defaultProjectKey, setDefaultProjectKey] = useState<string | null>(null);

  const [mappings, setMappings] = useState<WebsiteMapping[]>([]);

  const canContinue = Boolean(defaultSiteId && defaultProjectKey);
  const usedWebsiteIds = new Set(mappings.map((mapping) => mapping.websiteId));
  const hasIncompleteMappings = mappings.some(
    (mapping) => !mapping.websiteId || !mapping.siteId || !mapping.projectKey,
  );
  const noAvailableWebsites =
    sitecoreSites.find((website) => !usedWebsiteIds.has(website.id)) === undefined;
  const disableAddMapping = !canContinue || noAvailableWebsites;

  const persistDefaultsPlaceholder = () => {
    // TODO: send default site/project to DB when setup wizard persistence is implemented.
    console.log(defaultSiteId);
    console.log(defaultProjectKey);
  };

  const persistMappingsPlaceholder = () => {
    // TODO: send mappings to DB when setup wizard persistence is implemented.
    console.log(mappings);
  };

  const handleDefaultSiteChange = (siteId: string) => {
    setDefaultSiteId(siteId);
    setDefaultProjectKey(null);
  };

  const handleDefaultProjectChange = (projectKey: string) => {
    setDefaultProjectKey(projectKey);
  };

  const handleGoToStep2 = () => {
    if (!defaultSiteId || !defaultProjectKey) return;
    setIsEditingDefaultsStep2(false);
    setStep(2);
  };

  const handleGetStartedStep1 = () => {
    persistDefaultsPlaceholder();
  };

  const handleGetStartedStep2 = () => {
    persistDefaultsPlaceholder();
    persistMappingsPlaceholder();
  };

  const handleAddMapping = () => {
    const usedWebsites = new Set(mappings.map((mapping) => mapping.websiteId));
    const firstAvailableWebsite =
      sitecoreSites.find((website) => !usedWebsites.has(website.id))?.id ??
      sitecoreSites[0]?.id ??
      "";

    const nextMappings = [
      ...mappings,
      {
        id: crypto.randomUUID(),
        websiteId: firstAvailableWebsite,
        siteId: "",
        projectKey: "",
      },
    ];
    setMappings(nextMappings);
  };

  const handleMappingChange = (
    mappingId: string,
    field: "websiteId" | "siteId" | "projectKey",
    value: string,
  ) => {
    const nextMappings = mappings.map((mapping) =>
      mapping.id === mappingId
        ? {
            ...mapping,
            [field]: value,
            ...(field === "siteId" ? { projectKey: "" } : {}),
          }
        : mapping,
    );
    setMappings(nextMappings);
  };

  const handleDeleteMapping = (mappingId: string) => {
    const nextMappings = mappings.filter((mapping) => mapping.id !== mappingId);
    setMappings(nextMappings);
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
                disabled={!canContinue}
                onClick={() => {
                  void handleGetStartedStep1();
                }}
              >
                Get Started
              </Button>
              <Button
                variant="outline"
                colorScheme="neutral"
                data-testid="wizard-go-to-mapping"
                disabled={!canContinue}
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
                disabled={disableAddMapping}
              >
                <Icon path={mdiPlus} size={0.8} />
                Add mapping
              </Button>
            </div>

            <div className="mt-auto flex w-full flex-col gap-3 py-4">
              <Button
                data-testid="wizard-get-started-step2"
                disabled={!canContinue || hasIncompleteMappings}
                onClick={() => {
                  void handleGetStartedStep2();
                }}
              >
                Get started
              </Button>
              <Button
                variant="outline"
                colorScheme="neutral"
                data-testid="wizard-back-step1"
                onClick={() => {
                  setStep(1);
                  setMappings([]);
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
