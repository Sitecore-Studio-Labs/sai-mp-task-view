"use client";

import { mdiDeleteForever, mdiLinkOff } from "@mdi/js";
import { useTaskManager } from "@mp/task-core";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogTitle,
  Button,
  Icon,
} from "@mp/ui";
import { useState } from "react";

import { useDisconnectJira, useJiraConnectionStatus } from "@/hooks/useJiraConnectionStatus";

export function DisconnectJiraButton() {
  const { data: status } = useJiraConnectionStatus();
  const { setSelectedSiteId, setSelectedProjectKey } = useTaskManager();
  const connected = status?.connected ?? false;

  const disconnect = useDisconnectJira();
  const [isDisconnecting, setIsDisconnecting] = useState(false);
  const [confirmOpen, setConfirmOpen] = useState(false);

  const handleDisconnect = async () => {
    setIsDisconnecting(true);
    try {
      await disconnect();
      setSelectedSiteId(null);
      setSelectedProjectKey(null);
    } finally {
      setIsDisconnecting(false);
      setConfirmOpen(false);
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
      setConfirmOpen(false);
    }
  };

  if (!connected) return null;

  return (
    <>
      <Button
        colorScheme="danger"
        onClick={() => setConfirmOpen(true)}
        disabled={isDisconnecting}
        className="w-full"
        data-testid="open-disconnect-confirm"
      >
        <Icon path={mdiLinkOff} />
        Disconnect Jira Account
      </Button>

      <AlertDialog open={confirmOpen} onOpenChange={setConfirmOpen}>
        <AlertDialogContent className="sm:max-w-lg" data-testid="disconnect-confirm-dialog">
          <AlertDialogTitle>Disconnect from Jira?</AlertDialogTitle>
          <AlertDialogDescription>
            <span className="block space-y-2">
              <span className="block">
                <strong>Disconnect</strong> signs you out of Jira. Your default project and website
                mappings stay saved and return when you reconnect.
              </span>
              <span className="block">
                <strong>Disconnect &amp; Clear</strong> also removes that saved data. You can
                reconnect to Jira afterward, but you will go through setup again.
              </span>
            </span>
          </AlertDialogDescription>
          <AlertDialogFooter>
            <AlertDialogCancel disabled={isDisconnecting} data-testid="cancel-disconnect">
              Cancel
            </AlertDialogCancel>
            <AlertDialogAction
              disabled={isDisconnecting}
              variant="outline"
              title="Disconnect and wipe all settings"
              data-testid="confirm-disconnect-wipe"
              onClick={async (e) => {
                e.preventDefault();
                await handleDisconnectAndWipe();
              }}
            >
              <Icon path={mdiDeleteForever} />
              {isDisconnecting ? "Working…" : "Disconnect & Clear"}
            </AlertDialogAction>
            <AlertDialogAction
              disabled={isDisconnecting}
              colorScheme="danger"
              data-testid="confirm-disconnect"
              onClick={async (e) => {
                e.preventDefault();
                await handleDisconnect();
              }}
            >
              <Icon path={mdiLinkOff} />
              {isDisconnecting ? "Disconnecting…" : "Disconnect"}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  );
}
