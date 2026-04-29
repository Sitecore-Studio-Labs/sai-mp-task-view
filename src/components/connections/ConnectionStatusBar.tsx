"use client";

import {
  mdiCloudOffOutline,
  mdiCloudOutline,
  mdiCloudSyncOutline,
  mdiDotsVertical,
  mdiLinkOff,
} from "@mdi/js";
import { useEffect, useState } from "react";

import {
  AlertDialog,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuGroup,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Separator } from "@/components/ui/separator";
import { useDisconnectJira, useJiraConnectionStatus } from "@/hooks/useJiraConnectionStatus";
import { Icon } from "@/lib/icon";
import { useTaskManager } from "@/providers/task-manager/TaskManagerProvider";

export default function ConnectionStatusBar() {
  const { data: status, isLoading, refetch } = useJiraConnectionStatus();
  const { setSelectedSiteId, setSelectedProjectKey } = useTaskManager();

  const connected = status?.connected ?? false;

  const disconnect = useDisconnectJira();
  const [isDisconnecting, setIsDisconnecting] = useState(false);
  const [confirmDisconnectOpen, setConfirmDisconnectOpen] = useState(false);

  // Refetch when tab regains focus
  useEffect(() => {
    const onFocus = () => refetch();
    window.addEventListener("focus", onFocus);
    return () => window.removeEventListener("focus", onFocus);
  }, [refetch]);

  const handleDisconnect = async () => {
    setIsDisconnecting(true);
    try {
      await disconnect();
      setSelectedSiteId(null);
      setSelectedProjectKey(null);
    } finally {
      setIsDisconnecting(false);
    }
  };

  const isBusy = isLoading || isDisconnecting;

  const statusLabel = isLoading
    ? "Checking status…"
    : connected
      ? "Connected to Jira"
      : "Not connected";

  const liveLabel = isLoading ? "Syncing" : isDisconnecting ? "Disconnecting" : "Live";

  const iconPath = isBusy ? mdiCloudSyncOutline : connected ? mdiCloudOutline : mdiCloudOffOutline;

  if (!connected) {
    return null;
  }

  return (
    <>
      <div className="wrapper flex min-h-10 flex-wrap items-center gap-2">
        <div className="mr-auto flex items-center gap-1">
          <Icon path={iconPath} className="mr-1 size-5" />
          <span className="text-sm font-medium">{statusLabel}</span>
        </div>

        {connected && (
          <>
            <div className="flex items-center gap-2 text-sm text-gray-500">
              <span
                className={`h-2 w-2 shrink-0 rounded-full ${
                  isBusy ? "bg-gray-500" : "bg-green-400"
                }`}
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
                    onSelect={() => {
                      setConfirmDisconnectOpen(true);
                    }}
                    disabled={isDisconnecting || isLoading}
                  >
                    <Icon path={mdiLinkOff} size={1.5} />
                    Disconnect
                  </DropdownMenuItem>
                </DropdownMenuGroup>
              </DropdownMenuContent>
            </DropdownMenu>

            <AlertDialog open={confirmDisconnectOpen} onOpenChange={setConfirmDisconnectOpen}>
              <AlertDialogContent>
                <AlertDialogTitle>Disconnect Jira</AlertDialogTitle>
                <AlertDialogDescription>
                  Are you sure you want to disconnect Jira? You can reconnect again at any time.
                </AlertDialogDescription>
                <AlertDialogFooter>
                  <AlertDialogCancel disabled={isBusy}>Cancel</AlertDialogCancel>
                  <Button
                    disabled={isBusy}
                    onClick={async () => {
                      setConfirmDisconnectOpen(false);
                      await handleDisconnect();
                    }}
                  >
                    {isBusy ? "Disconnecting..." : "Disconnect"}
                  </Button>
                </AlertDialogFooter>
              </AlertDialogContent>
            </AlertDialog>
          </>
        )}
      </div>

      <Separator className="mb-4" />
    </>
  );
}
