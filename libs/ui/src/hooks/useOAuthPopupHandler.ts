"use client";

import type { QueryKey } from "@tanstack/react-query";
import { useQueryClient } from "@tanstack/react-query";
import { useCallback, useEffect, useRef } from "react";
import { toast } from "sonner";

import { usePlatformConnectionStatus } from "./usePlatformConnectionStatus";

type Options = {
  /** Platform slug (e.g., "jira", "wrike") from PlatformCapabilities.platformName */
  platform: string;
  successValue?: string;
  invalidateKeys?: QueryKey[];
  /** Shown as a success toast. Omit to suppress the toast (e.g. when another hook already shows it). */
  successMessage?: string;
  /** Called after queries are invalidated and toast is shown. */
  onSuccess?: () => void;
};

export function useOAuthPopupHandler({
  platform,
  successValue = "connected",
  invalidateKeys = [],
  successMessage,
  onSuccess,
}: Options) {
  const queryClient = useQueryClient();
  const handledRef = useRef(false);

  const { data: status } = usePlatformConnectionStatus();
  const connected = status?.connected ?? false;

  const allowedOrigin = (
    process.env.NEXT_PUBLIC_APP_URL ?? (typeof window !== "undefined" ? window.location.origin : "")
  ).replace(/\/$/, "");

  const handleSuccess = useCallback(() => {
    if (handledRef.current) return;
    handledRef.current = true;

    // Always refresh platform-agnostic status queries
    queryClient.invalidateQueries({ queryKey: ["platform", "connectionStatus"] });
    queryClient.invalidateQueries({ queryKey: ["platform", "sites"] });
    queryClient.invalidateQueries({ queryKey: ["platform", "projects"] });

    // Plus any platform-specific keys the caller provides
    invalidateKeys.forEach((key) => queryClient.invalidateQueries({ queryKey: key }));

    if (successMessage && connected) toast.success(successMessage);
    onSuccess?.();
  }, [connected, invalidateKeys, onSuccess, queryClient, successMessage]);

  useEffect(() => {
    if (typeof window === "undefined") return;
    if (!platform) return;
    const params = new URLSearchParams(window.location.search);
    if (params.get(platform) !== successValue) return;

    if (window.opener) {
      window.opener.postMessage({ type: "OAUTH_CONNECTED", platform }, allowedOrigin);
      window.close();
      return;
    }

    handleSuccess();
    window.history.replaceState({}, "", window.location.pathname);
  }, [allowedOrigin, handleSuccess, platform, successValue]);

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
