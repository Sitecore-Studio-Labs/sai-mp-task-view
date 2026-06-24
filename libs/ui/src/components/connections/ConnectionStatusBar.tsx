"use client";

import { mdiCloudOffOutline, mdiCloudOutline, mdiCloudSyncOutline } from "@mdi/js";
import { usePlatformCapabilities, useTaskManager } from "@mp/task-core";
import type { ReactNode } from "react";
import { useEffect, useState } from "react";

import {
  usePlatformConnectionStatus,
  usePlatformDisconnect,
} from "../../hooks/usePlatformConnectionStatus";
import { Icon } from "../ui/icon";
import { Separator } from "../ui/separator";
import { DisconnectButton } from "./DisconnectButton";
import { SettingsPanel } from "./SettingsPanel";

interface ConnectionStatusBarProps {
  /**
   * Optional override for the settings panel rendered at the right of the status bar.
   * When omitted, renders the generic SettingsPanel with a basic disconnect button.
   */
  settingsPanel?: ReactNode;
}

/**
 * Platform-agnostic connection status bar. Shows connection state, a live indicator,
 * and a settings panel. Reads the platform name from PlatformCapabilitiesContext.
 * Returns null when not connected.
 */
export function ConnectionStatusBar({ settingsPanel }: ConnectionStatusBarProps) {
  const { platformDisplayName } = usePlatformCapabilities();
  const { data: status, isLoading, refetch } = usePlatformConnectionStatus();
  const { setSelectedSiteId, setSelectedProjectKey } = useTaskManager();
  const connected = status?.connected ?? false;
  const disconnect = usePlatformDisconnect();
  const [isDisconnecting, setIsDisconnecting] = useState(false);

  useEffect(() => {
    const onFocus = () => refetch();
    window.addEventListener("focus", onFocus);
    return () => window.removeEventListener("focus", onFocus);
  }, [refetch]);

  const handleDisconnect = async () => {
    setIsDisconnecting(true);
    try {
      await disconnect.mutateAsync(undefined);
      setSelectedSiteId(null);
      setSelectedProjectKey(null);
    } finally {
      setIsDisconnecting(false);
    }
  };

  if (!connected) return null;

  const isBusy = isLoading || isDisconnecting;
  const statusLabel = isLoading ? "Checking status…" : `Connected to ${platformDisplayName}`;
  const liveLabel = isLoading ? "Syncing" : isDisconnecting ? "Disconnecting" : "Live";
  const iconPath = isBusy ? mdiCloudSyncOutline : connected ? mdiCloudOutline : mdiCloudOffOutline;

  const defaultSettingsPanel = (
    <SettingsPanel>
      <DisconnectButton onDisconnect={handleDisconnect} />
    </SettingsPanel>
  );

  return (
    <>
      <div
        className="wrapper flex min-h-10 flex-wrap items-center gap-2"
        data-testid="connection-status-bar"
      >
        <div className="mr-auto flex items-center gap-1">
          <Icon
            path={iconPath}
            size="md"
            colorScheme="inherit"
            className="text-foreground mr-1"
            title={statusLabel}
          />
          <span className="text-foreground text-sm font-medium">{statusLabel}</span>
        </div>

        <div className="text-muted-foreground flex items-center gap-2 text-sm">
          <span
            className={`h-2 w-2 shrink-0 rounded-full ${isBusy ? "bg-gray-500" : "bg-teal-400"}`}
            aria-hidden
          />
          {liveLabel}
        </div>

        {settingsPanel ?? defaultSettingsPanel}
      </div>

      <Separator className="mb-4" />
    </>
  );
}
