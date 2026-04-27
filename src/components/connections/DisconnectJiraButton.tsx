"use client";

import { mdiLinkOff } from "@mdi/js";
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

  const isBusy = isLoading || isDisconnecting;

  if (!connected) {
    return null;
  }

  return (
    <>
      <Button
        colorScheme="danger"
        onClick={() => {
          setConfirmDisconnectOpen(true);
        }}
        disabled={isBusy}
        className="w-full"
        data-testid="open-disconnect-confirm"
      >
        <Icon path={mdiLinkOff} />
        Disconnect Jira Account
      </Button>

      <AlertDialog open={confirmDisconnectOpen} onOpenChange={setConfirmDisconnectOpen}>
        <AlertDialogContent data-testid="disconnect-confirm-dialog">
          <AlertDialogTitle>Disconnect Jira</AlertDialogTitle>
          <AlertDialogDescription>
            Are you sure you want to disconnect Jira? You can reconnect again at any time.
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
    </>
  );
}
