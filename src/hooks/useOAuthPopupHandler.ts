"use client";

import type { QueryKey } from "@tanstack/react-query";
import { useQueryClient } from "@tanstack/react-query";
import { useCallback, useEffect, useRef } from "react";
import { toast } from "sonner";

import { System } from "@/constants/systems";
import { useJiraConnectionStatus } from "@/hooks/useJiraConnectionStatus";

type Options = {
  platform: System;
  successValue?: string; // default: 'connected'
  invalidateKeys: QueryKey[];
  successMessage: string;
};

export function useOAuthPopupHandler({
  platform,
  successValue = "connected",
  invalidateKeys,
  successMessage,
}: Options) {
  const queryClient = useQueryClient();
  const handledRef = useRef(false);

  const { data: status } = useJiraConnectionStatus();

  // Allow OAuth success handling after each new connection attempt. If we don't reset this,
  // second+ connects in the same SPA session (after disconnect) are ignored.
  useEffect(() => {
    if (status?.connected === false) {
      handledRef.current = false;
    }
  }, [status?.connected]);

  const allowedOrigin = (
    process.env.NEXT_PUBLIC_APP_URL ?? (typeof window !== "undefined" ? window.location.origin : "")
  ).replace(/\/$/, "");

  const handleSuccess = useCallback(() => {
    if (handledRef.current) return;
    handledRef.current = true;

    invalidateKeys.forEach((key) => {
      void queryClient.invalidateQueries({ queryKey: key });
    });
    toast.success(successMessage);
  }, [invalidateKeys, queryClient, successMessage]);

  // After OAuth callback we land with ?jira=connected. If we're in a popup, tell opener and close.
  useEffect(() => {
    if (typeof window === "undefined") return;

    const params = new URLSearchParams(window.location.search);

    if (params.get(platform.toLowerCase()) !== successValue) return;

    if (window.opener) {
      window.opener.postMessage({ type: "OAUTH_CONNECTED", platform }, allowedOrigin);
      window.close();
      return;
    }

    handleSuccess();
    window.history.replaceState({}, "", window.location.pathname);
  }, [allowedOrigin, handleSuccess, platform, successValue]);

  // Listen for popup finishing OAuth so we can refetch without user switching tabs
  useEffect(() => {
    const onMessage = (event: MessageEvent) => {
      if (event.origin !== allowedOrigin) return;

      if (event.data?.type === "OAUTH_CONNECTED" && event.data?.platform === platform) {
        handleSuccess();
      }
    };

    window.addEventListener("message", onMessage);
    return () => window.removeEventListener("message", onMessage);
  }, [allowedOrigin, handleSuccess, platform]);
}
