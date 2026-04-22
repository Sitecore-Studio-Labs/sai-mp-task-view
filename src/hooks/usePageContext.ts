"use client";

import type { HostState, PagesContext } from "@sitecore-marketplace-sdk/client";
import { useEffect, useMemo, useState } from "react";

import type { PageContextData, PagesContextPageInfo } from "@/types/page-context";

import { useMarketplaceClient } from "./useMarketplaceClient";

const INITIAL_STATE: PageContextData = {
  siteInfo: null,
  pageInfo: null,
  environment: null,
  isLoading: true,
  error: null,
};

function extractEnvironment(hostState: HostState | undefined): string | null {
  const tenantInfo = (hostState as Record<string, unknown> | undefined)?.xmCloudTenantInfo;
  if (!tenantInfo) return null;
  const envName = (tenantInfo as Record<string, unknown>).environmentName;
  return typeof envName === "string" ? envName : null;
}

export function usePageContext(): PageContextData {
  const { client, isInitialized, error: clientError } = useMarketplaceClient();
  const [state, setState] = useState<PageContextData>(INITIAL_STATE);

  useEffect(() => {
    if (!isInitialized || !client) return;

    let cancelled = false;
    let unsubscribePages: (() => void) | undefined;

    const applyPagesContext = (pagesContext: PagesContext | undefined) => {
      if (cancelled) return;
      setState((prev) => ({
        ...prev,
        siteInfo: pagesContext?.siteInfo ?? null,
        pageInfo: (pagesContext?.pageInfo as PagesContextPageInfo) ?? null,
        isLoading: false,
        error: null,
      }));
    };

    const applyHostState = (hostState: HostState | undefined) => {
      if (cancelled) return;
      setState((prev) => ({
        ...prev,
        environment: extractEnvironment(hostState),
      }));
    };

    (async () => {
      try {
        const [pagesResult, hostStateResult] = await Promise.all([
          client.query("pages.context", {
            subscribe: true,
            onSuccess: (data) => applyPagesContext(data as PagesContext | undefined),
          }),
          client.query("host.state"),
        ]);

        applyPagesContext(pagesResult.data as PagesContext | undefined);
        applyHostState(hostStateResult.data as HostState | undefined);

        unsubscribePages = pagesResult.unsubscribe;
      } catch (err) {
        if (cancelled) return;
        setState((prev) => ({
          ...prev,
          isLoading: false,
          error: err instanceof Error ? err : new Error("Failed to fetch page context"),
        }));
      }
    })();

    return () => {
      cancelled = true;
      unsubscribePages?.();
    };
  }, [isInitialized, client]);

  useEffect(() => {
    if (clientError) {
      setState({
        siteInfo: null,
        pageInfo: null,
        environment: null,
        isLoading: false,
        error: clientError,
      });
    }
  }, [clientError]);

  return useMemo(() => state, [state]);
}
