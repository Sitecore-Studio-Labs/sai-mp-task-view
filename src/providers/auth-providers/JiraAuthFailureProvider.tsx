"use client";

import { useQueryClient } from "@tanstack/react-query";
import { useCallback, useEffect, useState } from "react";
import { toast } from "sonner";

import {
  AlertDialog,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { Button } from "@/components/ui/button";
import { SYSTEMS } from "@/constants/systems";
import useClientOriginUrl from "@/hooks/useClientOriginUrl";
import {
  JIRA_PROJECTS_QUERY_KEY,
  JIRA_SITES_QUERY_KEY,
  JIRA_STATUS_QUERY_KEY,
} from "@/hooks/useJiraConnectionStatus";
import { setOnAuthFailureCallback } from "@/lib/axiosClient";

const POPUP_NAME = "jira_reconnect";
const POPUP_SPEC = "width=600,height=700,scrollbars=yes,resizable=yes";

const allowedOrigin = (): string =>
  (
    process.env.NEXT_PUBLIC_APP_URL ?? (typeof window !== "undefined" ? window.location.origin : "")
  ).replace(/\/$/, "");

export function JiraAuthFailureProvider({ children }: { children: React.ReactNode }) {
  const [showPopup, setShowPopup] = useState(false);
  const queryClient = useQueryClient();
  const connectUrl = useClientOriginUrl("/api/auth/jira/connect");

  const onAuthFailure = useCallback(() => {
    setShowPopup(true);
  }, []);

  useEffect(() => {
    setOnAuthFailureCallback(onAuthFailure);
    return () => setOnAuthFailureCallback(null);
  }, [onAuthFailure]);

  useEffect(() => {
    if (typeof window === "undefined") return;

    const onMessage = (event: MessageEvent) => {
      if (event.origin !== allowedOrigin()) return;

      if (event.data?.type === "OAUTH_CONNECTED" && event.data?.platform === SYSTEMS.JIRA) {
        setShowPopup(false);
        queryClient.invalidateQueries({ queryKey: JIRA_STATUS_QUERY_KEY });
        queryClient.invalidateQueries({ queryKey: JIRA_PROJECTS_QUERY_KEY });
        queryClient.invalidateQueries({ queryKey: JIRA_SITES_QUERY_KEY });
        queryClient.invalidateQueries({ queryKey: ["jira", "currentUser"] });
        toast.success("Jira connected successfully.");
      }
    };

    window.addEventListener("message", onMessage);
    return () => window.removeEventListener("message", onMessage);
  }, [queryClient]);

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
            <AlertDialogTitle>Jira session expired</AlertDialogTitle>
            <AlertDialogDescription>
              Your Jira session has expired or the connection was lost. Please reconnect to Jira to
              continue.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel onClick={handleDismiss}>Dismiss</AlertDialogCancel>
            <Button onClick={handleReconnect} disabled={!connectUrl}>
              {connectUrl ? "Reconnect Jira" : "Loading…"}
            </Button>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  );
}
