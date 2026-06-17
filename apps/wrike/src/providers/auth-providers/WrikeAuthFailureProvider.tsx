"use client";

import {
  AlertDialog,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  Button,
  useClientOriginUrl,
  useOAuthPopupHandler,
} from "@mp/ui";
import { useCallback, useEffect, useState } from "react";

import { setOnAuthFailureCallback } from "@/lib/axiosClient";
import { WRIKE_CAPABILITIES } from "@/providers/WrikePlatformCapabilitiesProvider";

const POPUP_NAME = "wrike_reconnect";
const POPUP_SPEC = "width=600,height=700,scrollbars=yes,resizable=yes";

export function WrikeAuthFailureProvider({ children }: { children: React.ReactNode }) {
  const [showPopup, setShowPopup] = useState(false);
  const connectUrl = useClientOriginUrl("/api/auth/wrike/connect");

  const onAuthFailure = useCallback(() => {
    setShowPopup(true);
  }, []);

  useEffect(() => {
    setOnAuthFailureCallback(onAuthFailure);
    return () => setOnAuthFailureCallback(null);
  }, [onAuthFailure]);

  // Close the reconnect dialog when the OAuth popup completes.
  // Query invalidation and success toast are handled by TaskManagerProvider's useOAuthPopupHandler.
  useOAuthPopupHandler({
    platform: WRIKE_CAPABILITIES.platformName,
    onSuccess: () => setShowPopup(false),
  });

  const handleReconnect = useCallback(() => {
    if (!connectUrl) return;
    const url = connectUrl;
    const popup = window.open(url, POPUP_NAME, POPUP_SPEC);
    if (!popup || popup.closed) {
      window.location.href = url;
    }
  }, [connectUrl]);

  const handleDismiss = useCallback(() => {
    setShowPopup(false);
  }, []);

  return (
    <>
      {children}
      <AlertDialog open={showPopup} onOpenChange={setShowPopup}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Wrike session expired</AlertDialogTitle>
            <AlertDialogDescription>
              Your Wrike session has expired or the connection was lost. Please reconnect to
              continue.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel onClick={handleDismiss}>Dismiss</AlertDialogCancel>
            <Button onClick={handleReconnect} disabled={!connectUrl}>
              {connectUrl ? "Reconnect Wrike" : "Loading…"}
            </Button>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  );
}
