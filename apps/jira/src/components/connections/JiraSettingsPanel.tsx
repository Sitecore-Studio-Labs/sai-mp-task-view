"use client";

import { mdiCogOutline } from "@mdi/js";
import type { PlatformScopeSelection } from "@mp/task-core";
import {
  buildUpsertPlatformSetupPayload,
  scopeSelectionsFromSetupRecord,
  usePlatformCapabilities,
} from "@mp/task-core";
import {
  Button,
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
  Icon,
  PlatformSetupScopePicker,
  Separator,
  WebsiteMappingsSection,
} from "@mp/ui";
import { useMemo, useState } from "react";

import { useSetup } from "@/hooks/useSetup";
import { useUpsertSetup } from "@/hooks/useUpsertSetup";

import { DisconnectJiraButton } from "./DisconnectJiraButton";

export function JiraSettingsPanel() {
  const [open, setOpen] = useState(false);
  const [isEditingDefaults, setIsEditingDefaults] = useState(false);

  const { setupScope } = usePlatformCapabilities();
  const { data: setupData } = useSetup();
  const setup = setupData?.setup ?? null;

  const { mutate: upsertSetup } = useUpsertSetup();

  const persistedSelections = useMemo(
    () => (setupScope ? scopeSelectionsFromSetupRecord(setup, setupScope) : {}),
    [setup, setupScope],
  );

  const [localSelections, setLocalSelections] = useState<
    Record<string, PlatformScopeSelection | null>
  >({});

  const displaySelections = isEditingDefaults ? localSelections : persistedSelections;

  const handleToggleEdit = () => {
    if (isEditingDefaults) {
      setIsEditingDefaults(false);
      if (!setupScope) return;

      const changed = setupScope.scopeLevels.some(
        (level) => localSelections[level.id]?.key !== persistedSelections[level.id]?.key,
      );
      if (!changed) return;

      const resolvedSelections = Object.fromEntries(
        Object.entries(localSelections).filter((entry): entry is [string, PlatformScopeSelection] =>
          Boolean(entry[1]),
        ),
      );

      upsertSetup(buildUpsertPlatformSetupPayload(resolvedSelections, setupScope));
    } else {
      setLocalSelections(persistedSelections);
      setIsEditingDefaults(true);
    }
  };

  const handleScopeSelectionChange = (
    levelId: string,
    selection: PlatformScopeSelection | null,
  ) => {
    setLocalSelections((prev) => ({ ...prev, [levelId]: selection }));
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
          <Icon path={mdiCogOutline} size={0.9} colorScheme="inherit" />
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

          <PlatformSetupScopePicker
            selections={displaySelections}
            onSelectionChange={handleScopeSelectionChange}
            readOnly={!isEditingDefaults}
            onToggleEdit={handleToggleEdit}
            labelClassName="text-sm font-medium"
            testIdPrefix="settings-panel"
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
