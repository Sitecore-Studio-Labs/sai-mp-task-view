"use client";

import { mdiDeleteForever, mdiLinkOff } from "@mdi/js";
import { useEffect, useState } from "react";

import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { Button } from "@/components/ui/button";
import { useDisconnectJira, useJiraConnectionStatus } from "@/hooks/useJiraConnectionStatus";
import { Icon } from "@/lib/icon";
import { useTaskManager } from "@/providers/task-manager/TaskManagerProvider";

export default function DisconnectJiraButton() {
  const { data: status, isLoading, refetch } = useJiraConnectionStatus();
  const { setSelectedSiteId, setSelectedProjectKey } = useTaskManager();

  const connected = status?.connected ?? false;

  const disconnect = useDisconnectJira();
  const [isDisconnecting, setIsDisconnecting] = useState(false);
  const [confirmDisconnectOpen, setConfirmDisconnectOpen] = useState(false);
  const [confirmWipeOpen, setConfirmWipeOpen] = useState(false);

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
      setConfirmDisconnectOpen(false);
    }
  };

  const handleDisconnectAndWipe = async () => {
    setIsDisconnecting(true);
    try {
      await disconnect(true);
      setSelectedSiteId(null);
      setSelectedProjectKey(null);
    } finally {
      setIsDisconnecting(false);
      setConfirmWipeOpen(false);
    }
  };

  const isBusy = isLoading || isDisconnecting;

  if (!connected) {
    return null;
  }

  return (
    <>
      <div className="flex w-full flex-col gap-2">
        <Button
          colorScheme="danger"
          onClick={() => {
            setConfirmWipeOpen(false);
            setConfirmDisconnectOpen(true);
          }}
          disabled={isBusy}
          className="w-full"
          data-testid="open-disconnect-confirm"
        >
          <Icon path={mdiLinkOff} />
          Disconnect Jira Account
        </Button>

        <Button
          variant="outline"
          colorScheme="danger"
          onClick={() => {
            setConfirmDisconnectOpen(false);
            setConfirmWipeOpen(true);
          }}
          disabled={isBusy}
          className="w-full"
          data-testid="open-disconnect-wipe-confirm"
        >
          <Icon path={mdiDeleteForever} />
          Disconnect and wipe all settings
        </Button>
      </div>

      <AlertDialog open={confirmDisconnectOpen} onOpenChange={setConfirmDisconnectOpen}>
        <AlertDialogContent data-testid="disconnect-confirm-dialog">
          <AlertDialogTitle>Disconnect Jira</AlertDialogTitle>
          <AlertDialogDescription>
            Are you sure you want to disconnect Jira? You can reconnect again at any time. Your
            default project and website mappings are kept so they come back when you reconnect.
          </AlertDialogDescription>
          <AlertDialogFooter>
            <AlertDialogCancel disabled={isBusy} data-testid="cancel-disconnect">
              Cancel
            </AlertDialogCancel>
            <AlertDialogAction
              disabled={isBusy}
              data-testid="confirm-disconnect"
              onClick={async () => {
                await handleDisconnect();
              }}
            >
              {isBusy ? "Disconnecting..." : "Disconnect"}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      <AlertDialog open={confirmWipeOpen} onOpenChange={setConfirmWipeOpen}>
        <AlertDialogContent data-testid="disconnect-wipe-confirm-dialog">
          <AlertDialogTitle>Disconnect and wipe all settings</AlertDialogTitle>
          <AlertDialogDescription>
            This disconnects Jira and permanently removes your default project, setup wizard data,
            and all website–to–Jira project mappings. You can reconnect to Jira afterward, but you
            will need to set everything up again.
          </AlertDialogDescription>
          <AlertDialogFooter>
            <AlertDialogCancel disabled={isBusy} data-testid="cancel-disconnect-wipe">
              Cancel
            </AlertDialogCancel>
            <AlertDialogAction
              disabled={isBusy}
              data-testid="confirm-disconnect-wipe"
              onClick={async () => {
                await handleDisconnectAndWipe();
              }}
            >
              {isBusy ? "Working…" : "Wipe and disconnect"}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  );
}
