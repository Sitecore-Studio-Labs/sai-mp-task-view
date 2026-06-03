"use client";

import { mdiCogOutline } from "@mdi/js";
import { usePlatformCapabilities } from "@mp/task-core";
import type { ReactNode } from "react";

import { Button } from "../ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "../ui/dialog";
import { Icon } from "../ui/icon";
import { Separator } from "../ui/separator";

interface SettingsPanelProps {
  children?: ReactNode;
}

export function SettingsPanel({ children }: SettingsPanelProps) {
  const { platformDisplayName } = usePlatformCapabilities();

  return (
    <Dialog>
      <DialogTrigger asChild>
        <Button variant="ghost" colorScheme="neutral" size="icon" aria-label="Settings">
          <Icon path={mdiCogOutline} size={0.9} colorScheme="inherit" />
          <span className="sr-only">Settings</span>
        </Button>
      </DialogTrigger>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>{platformDisplayName} Settings</DialogTitle>
          <DialogDescription>
            Manage your project mappings and connection settings.
          </DialogDescription>
        </DialogHeader>
        <Separator />
        <div className="flex flex-col gap-4">
          <p className="text-sm font-medium">Account</p>
          {children}
        </div>
      </DialogContent>
    </Dialog>
  );
}
