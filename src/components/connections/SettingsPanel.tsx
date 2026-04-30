"use client";

import { mdiCogOutline } from "@mdi/js";
import { useState } from "react";

import DisconnectJiraButton from "@/components/connections/DisconnectJiraButton";
import { MappedWebsitesSection } from "@/components/connections/MappedWebsitesSection";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { Icon } from "@/lib/icon";

import { Separator } from "../ui/separator";

export default function SettingsPanel() {
  const [open, setOpen] = useState(false);

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
        <div className="max-h-[min(70vh,28rem)] space-y-4 overflow-y-auto pr-1">
          <MappedWebsitesSection />
          <Separator />
          <div className="space-y-2">
            <h5 className="text-sm font-medium">Account</h5>
            <DisconnectJiraButton />
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}
