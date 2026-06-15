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
  usePlatformDisconnect,
} from "@mp/ui";
import { useState } from "react";

export function DisconnectWrikeButton() {
  const { setSelectedProjectKey } = useTaskManager();
  const { mutateAsync: disconnect } = usePlatformDisconnect();

  const [isDisconnecting, setIsDisconnecting] = useState(false);
  const [confirmOpen, setConfirmOpen] = useState(false);

  const handleDisconnect = async () => {
    setIsDisconnecting(true);
    try {
      await disconnect({ wipe: false });
      setSelectedProjectKey(null);
    } finally {
      setIsDisconnecting(false);
      setConfirmOpen(false);
    }
  };

  const handleDisconnectAndWipe = async () => {
    setIsDisconnecting(true);
    try {
      await disconnect({ wipe: true });
      setSelectedProjectKey(null);
    } finally {
      setIsDisconnecting(false);
      setConfirmOpen(false);
    }
  };

  return (
    <>
      <Button
        colorScheme="danger"
        onClick={() => setConfirmOpen(true)}
        disabled={isDisconnecting}
        className="w-full"
        data-testid="open-disconnect-confirm"
      >
        <Icon path={mdiLinkOff} colorScheme="inherit" />
        Disconnect Wrike Account
      </Button>

      <AlertDialog open={confirmOpen} onOpenChange={setConfirmOpen}>
        <AlertDialogContent className="sm:max-w-lg" data-testid="disconnect-confirm-dialog">
          <AlertDialogTitle>Disconnect from Wrike?</AlertDialogTitle>
          <AlertDialogDescription>
            <span className="block space-y-2">
              <span className="block">
                <strong>Disconnect</strong> signs you out of Wrike. Your default folder and website
                mappings stay saved and return when you reconnect.
              </span>
              <span className="block">
                <strong>Disconnect &amp; Wipe All</strong> also removes that saved data. You can
                reconnect afterward, but you will go through setup again.
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
              <Icon path={mdiDeleteForever} colorScheme="inherit" />
              {isDisconnecting ? "Working…" : "Disconnect & Wipe All"}
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
              <Icon path={mdiLinkOff} colorScheme="inherit" />
              {isDisconnecting ? "Disconnecting…" : "Disconnect"}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  );
}
