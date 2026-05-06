"use client";

import { mdiCogOutline } from "@mdi/js";
import { useState } from "react";

import DisconnectJiraButton from "@/components/connections/DisconnectJiraButton";
import WebsiteMappingsSection from "@/components/connections/WebsiteMappingsSection";
import DefaultsPicker from "@/components/setup-wizard/DefaultsPicker";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { useJiraProjects } from "@/hooks/useJiraProjects";
import { useSetup } from "@/hooks/useSetup";
import { useUpsertSetup } from "@/hooks/useUpsertSetup";
import { Icon } from "@/lib/icon";
import { useTaskManager } from "@/providers/task-manager/TaskManagerProvider";

import { Separator } from "../ui/separator";

export default function SettingsPanel() {
  const [open, setOpen] = useState(false);
  const [isEditingDefaults, setIsEditingDefaults] = useState(false);

  const { sites } = useTaskManager();
  const { data: setupData } = useSetup();
  const setup = setupData?.setup ?? null;
  const currentSiteId = setup?.jira_site_id ?? null;
  const currentProjectKey = setup?.default_project_key ?? null;

  const { mutate: upsertSetup } = useUpsertSetup();

  const [localSiteId, setLocalSiteId] = useState<string | null>(null);
  const [localProjectKey, setLocalProjectKey] = useState<string | null>(null);

  const { data: localProjects = [] } = useJiraProjects(localSiteId || "");

  const handleToggleEdit = () => {
    if (isEditingDefaults) {
      setIsEditingDefaults(false);

      const hasChanged = localSiteId !== currentSiteId || localProjectKey !== currentProjectKey;
      if (!hasChanged || !localSiteId || !localProjectKey) return;

      const site = sites.find((s) => s.id === localSiteId);
      const project = localProjects.find((p) => p.key === localProjectKey);

      if (!site || !project) return;

      upsertSetup({
        jiraSiteId: site.id,
        jiraSiteUrl: site.url,
        jiraSiteName: site.name,
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
        <DialogHeader className="text-left">
          <DialogTitle>Jira Settings</DialogTitle>
          <DialogDescription>
            Manage your project mappings and connection settings.
          </DialogDescription>
        </DialogHeader>
        <Separator />

        <DefaultsPicker
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

        <div className="space-y-2">
          <h5 className="text-sm font-medium">Account</h5>
          <DisconnectJiraButton />
        </div>
      </DialogContent>
    </Dialog>
  );
}
