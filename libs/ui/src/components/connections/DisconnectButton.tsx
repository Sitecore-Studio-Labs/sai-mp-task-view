"use client";

import { usePlatformCapabilities } from "@mp/task-core";
import { useState } from "react";

import {
  AlertDialog,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogTitle,
} from "../ui/alert-dialog";
import { Button } from "../ui/button";

interface DisconnectButtonProps {
  onDisconnect: () => Promise<void>;
}

export function DisconnectButton({ onDisconnect }: DisconnectButtonProps) {
  const { platformDisplayName } = usePlatformCapabilities();
  const [confirmOpen, setConfirmOpen] = useState(false);
  const [isDisconnecting, setIsDisconnecting] = useState(false);

  const handleConfirm = async () => {
    setConfirmOpen(false);
    setIsDisconnecting(true);
    try {
      await onDisconnect();
    } finally {
      setIsDisconnecting(false);
    }
  };

  return (
    <>
      <Button
        variant="outline"
        colorScheme="danger"
        onClick={() => setConfirmOpen(true)}
        disabled={isDisconnecting}
        data-testid="open-disconnect-confirm"
      >
        {isDisconnecting ? "Disconnecting..." : `Disconnect ${platformDisplayName} Account`}
      </Button>

      <AlertDialog open={confirmOpen} onOpenChange={setConfirmOpen}>
        <AlertDialogContent data-testid="disconnect-confirm-dialog">
          <AlertDialogTitle>Disconnect {platformDisplayName}</AlertDialogTitle>
          <AlertDialogDescription>
            Are you sure you want to disconnect {platformDisplayName}? You can reconnect again at
            any time.
          </AlertDialogDescription>
          <AlertDialogFooter>
            <AlertDialogCancel disabled={isDisconnecting} data-testid="cancel-disconnect">
              Cancel
            </AlertDialogCancel>
            <Button
              colorScheme="danger"
              disabled={isDisconnecting}
              onClick={handleConfirm}
              data-testid="confirm-disconnect"
            >
              {isDisconnecting ? "Disconnecting..." : "Disconnect"}
            </Button>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  );
}
