"use client";

import {
  mdiCloudOffOutline,
  mdiCloudOutline,
  mdiCloudSyncOutline,
  mdiDotsVertical,
  mdiLinkOff,
} from "@mdi/js";
import { usePlatformCapabilities, useTaskManager } from "@mp/task-core";
import { useEffect, useState } from "react";

import {
  usePlatformConnectionStatus,
  usePlatformDisconnect,
} from "../../hooks/usePlatformConnectionStatus";
import {
  AlertDialog,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogTitle,
} from "../ui/alert-dialog";
import { Button } from "../ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuGroup,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "../ui/dropdown-menu";
import { Icon } from "../ui/icon";
import { Separator } from "../ui/separator";

/**
 * Platform-agnostic connection status bar. Shows connection state, a live indicator,
 * and a disconnect button. Reads the platform name from PlatformCapabilitiesContext.
 * Returns null when not connected.
 */
export function ConnectionStatusBar() {
  const { platformDisplayName } = usePlatformCapabilities();
  const { data: status, isLoading, refetch } = usePlatformConnectionStatus();
  const { setSelectedSiteId, setSelectedProjectKey } = useTaskManager();
  const connected = status?.connected ?? false;
  const disconnect = usePlatformDisconnect();
  const [isDisconnecting, setIsDisconnecting] = useState(false);
  const [confirmOpen, setConfirmOpen] = useState(false);

  useEffect(() => {
    const onFocus = () => refetch();
    window.addEventListener("focus", onFocus);
    return () => window.removeEventListener("focus", onFocus);
  }, [refetch]);

  const handleDisconnect = async () => {
    setIsDisconnecting(true);
    try {
      await disconnect.mutateAsync();
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

  return (
    <>
      <div className="wrapper flex min-h-10 flex-wrap items-center gap-2">
        <div className="mr-auto flex items-center gap-1">
          <Icon path={iconPath} className="mr-1 size-5" />
          <span className="text-sm font-medium">{statusLabel}</span>
        </div>

        <div className="flex items-center gap-2 text-sm text-gray-500">
          <span
            className={`h-2 w-2 shrink-0 rounded-full ${isBusy ? "bg-gray-500" : "bg-green-400"}`}
            aria-hidden
          />
          {liveLabel}
        </div>

        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <Button
              variant="ghost"
              colorScheme="neutral"
              size="icon"
              aria-label="Connection options"
            >
              <Icon path={mdiDotsVertical} size={0.8} />
              <span className="sr-only">Connection options</span>
            </Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end">
            <DropdownMenuGroup>
              <DropdownMenuItem
                variant="destructive"
                onSelect={() => setConfirmOpen(true)}
                disabled={isBusy}
              >
                <Icon path={mdiLinkOff} size={1.5} />
                Disconnect
              </DropdownMenuItem>
            </DropdownMenuGroup>
          </DropdownMenuContent>
        </DropdownMenu>

        <AlertDialog open={confirmOpen} onOpenChange={setConfirmOpen}>
          <AlertDialogContent>
            <AlertDialogTitle>Disconnect {platformDisplayName}</AlertDialogTitle>
            <AlertDialogDescription>
              Are you sure you want to disconnect {platformDisplayName}? You can reconnect again at
              any time.
            </AlertDialogDescription>
            <AlertDialogFooter>
              <AlertDialogCancel disabled={isBusy}>Cancel</AlertDialogCancel>
              <Button
                disabled={isBusy}
                onClick={async () => {
                  setConfirmOpen(false);
                  await handleDisconnect();
                }}
              >
                {isBusy ? "Disconnecting..." : "Disconnect"}
              </Button>
            </AlertDialogFooter>
          </AlertDialogContent>
        </AlertDialog>
      </div>

      <Separator className="mb-4" />
    </>
  );
}
