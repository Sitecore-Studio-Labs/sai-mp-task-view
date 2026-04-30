"use client";

import { mdiCogOutline } from "@mdi/js";
import { useState } from "react";

import DisconnectJiraButton from "@/components/connections/DisconnectJiraButton";
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
import { useJiraSelectProject } from "@/hooks/useJiraSelectProject";
import { useJiraSelectSite } from "@/hooks/useJiraSelectSite";
import { Icon } from "@/lib/icon";
import { useTaskManager } from "@/providers/task-manager/TaskManagerProvider";

import { Separator } from "../ui/separator";

export default function SettingsPanel() {
  const [open, setOpen] = useState(false);
  const [isEditingDefaults, setIsEditingDefaults] = useState(false);

  const { selectedSiteId, setSelectedSiteId, effectiveProjectKey, setSelectedProjectKey } =
    useTaskManager();

  const { mutate: selectSite } = useJiraSelectSite();
  const { mutate: selectProject } = useJiraSelectProject();

  const [localSiteId, setLocalSiteId] = useState<string | null>(null);
  const [localProjectKey, setLocalProjectKey] = useState<string | null>(null);

  const handleLocalSiteChange = (siteId: string) => {
    setLocalSiteId(siteId);
  };

  const handleToggleEdit = () => {
    if (isEditingDefaults) {
      setIsEditingDefaults(false);

      if (localSiteId && localSiteId !== selectedSiteId) {
        selectSite({ cloudId: localSiteId }, { onSuccess: () => setSelectedSiteId(localSiteId) });
      }

      if (localProjectKey && localProjectKey !== effectiveProjectKey) {
        selectProject(
          { projectKey: localProjectKey },
          { onSuccess: () => setSelectedProjectKey(localProjectKey) },
        );
      } else if (!localProjectKey) {
        setSelectedProjectKey(null);
      }
    } else {
      setLocalSiteId(selectedSiteId);
      setLocalProjectKey(effectiveProjectKey);
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
          selectedSiteId={isEditingDefaults ? localSiteId : selectedSiteId}
          selectedProjectKey={isEditingDefaults ? localProjectKey : effectiveProjectKey}
          onSiteChange={handleLocalSiteChange}
          onProjectChange={setLocalProjectKey}
          siteTestId="settings-panel-site"
          projectTestId="settings-panel-project"
          readOnly={!isEditingDefaults}
          onToggleEdit={handleToggleEdit}
          labelClassName="text-sm font-medium"
        />

        <Separator />

        <div className="space-y-2">
          <h5 className="text-sm font-medium">Account</h5>
          <DisconnectJiraButton />
        </div>
      </DialogContent>
    </Dialog>
  );
}
