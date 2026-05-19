"use client";

import { mdiCogOutline } from "@mdi/js";
import { useTaskManager } from "@mp/task-core";
import {
  Button,
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
  Icon,
  PlatformSetupDefaultsPicker,
  Separator,
  WebsiteMappingsSection,
} from "@mp/ui";
import { useState } from "react";

import { useJiraProjects } from "@/hooks/useJiraProjects";
import { useSetup } from "@/hooks/useSetup";
import { useUpsertSetup } from "@/hooks/useUpsertSetup";

import { DisconnectJiraButton } from "./DisconnectJiraButton";

export function JiraSettingsPanel() {
  const [open, setOpen] = useState(false);
  const [isEditingDefaults, setIsEditingDefaults] = useState(false);

  const { sites } = useTaskManager();
  const { data: setupData } = useSetup();
  const setup = setupData?.setup ?? null;
  const currentSiteId = setup?.siteId ?? null;
  const currentProjectKey = setup?.defaultProjectKey ?? null;

  const { mutate: upsertSetup } = useUpsertSetup();

  const [localSiteId, setLocalSiteId] = useState<string | null>(null);
  const [localProjectKey, setLocalProjectKey] = useState<string | null>(null);

  const { data: localProjects = [] } = useJiraProjects(localSiteId ?? "");

  const handleToggleEdit = () => {
    if (isEditingDefaults) {
      setIsEditingDefaults(false);
      const hasChanged = localSiteId !== currentSiteId || localProjectKey !== currentProjectKey;
      if (!hasChanged || !localSiteId || !localProjectKey) return;

      const site = sites.find((s) => s.id === localSiteId);
      const project = localProjects.find((p) => p.key === localProjectKey);
      if (!site || !project) return;

      upsertSetup({
        siteId: site.id,
        siteUrl: site.url,
        siteName: site.name,
        defaultProjectId: project.id,
        defaultProjectKey: project.key,
        defaultProjectName: project.name,
      });
    } else {
      setLocalSiteId(currentSiteId);
      setLocalProjectKey(currentProjectKey);
      setIsEditingDefaults(true);
    }
  };

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button
          variant="ghost"
          colorScheme="neutral"
          size="icon"
          title="Open settings"
          aria-label="Open settings"
          data-testid="open-settings-panel"
        >
          <Icon path={mdiCogOutline} size={0.9} />
          <span className="sr-only">Open settings</span>
        </Button>
      </DialogTrigger>

      <DialogContent size="sm" data-testid="settings-panel-dialog">
        <div className="-mr-7 max-h-[70vh] space-y-4 overflow-y-auto pr-7">
          <DialogHeader className="text-left">
            <DialogTitle>Jira Settings</DialogTitle>
            <DialogDescription>
              Manage your project mappings and connection settings.
            </DialogDescription>
          </DialogHeader>

          <Separator />

          <PlatformSetupDefaultsPicker
            selectedSiteId={isEditingDefaults ? localSiteId : currentSiteId}
            selectedProjectKey={isEditingDefaults ? localProjectKey : currentProjectKey}
            onSiteChange={setLocalSiteId}
            onProjectChange={setLocalProjectKey}
            siteTestId="settings-panel-site"
            projectTestId="settings-panel-project"
            readOnly={!isEditingDefaults}
            onToggleEdit={handleToggleEdit}
            labelClassName="text-sm font-medium"
          />

          <Separator />

          <WebsiteMappingsSection />

          <Separator />

          <div className="space-y-2 pb-1">
            <h5 className="text-sm font-medium">Account</h5>
            <DisconnectJiraButton />
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}
