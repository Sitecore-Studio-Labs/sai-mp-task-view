"use client";

import type { ApplicationContext } from "@sitecore-marketplace-sdk/client";
import { useEffect, useState } from "react";

import { useMarketplaceClient } from "./useMarketplaceClient";

export type SitecoreSite = {
  id: string;
  name: string;
  displayName: string;
};

type UseSitecoreSitesState = {
  sites: SitecoreSite[];
  isLoading: boolean;
  error: Error | null;
};

export function useSitecoreSites() {
  const { client, error: clientError, isInitialized } = useMarketplaceClient();
  const [state, setState] = useState<UseSitecoreSitesState>({
    sites: [],
    isLoading: true,
    error: null,
  });

  useEffect(() => {
    if (!isInitialized || !client) return;

    let cancelled = false;

    void (async () => {
      try {
        setState((prev) => ({ ...prev, isLoading: true, error: null }));

        const contextResult = await client.query("application.context");
        const appContext = (contextResult.data as ApplicationContext | undefined) ?? undefined;
        const sitecoreContextId = appContext?.resourceAccess?.[0]?.context.live;

        if (!sitecoreContextId) {
          throw new Error(
            "Sitecore Context ID not found in application context. Check SitecoreAI API configuration.",
          );
        }

        const response = await client.query("xmc.xmapp.listSites", {
          params: {
            query: {
              sitecoreContextId,
            },
          },
        });

        if (cancelled) return;
        setState({
          sites: ((response.data as { data?: SitecoreSite[] })?.data ?? []) as SitecoreSite[],
          isLoading: false,
          error: null,
        });
      } catch (err) {
        if (cancelled) return;
        setState({
          sites: [],
          isLoading: false,
          error: err instanceof Error ? err : new Error("Failed to list Sitecore sites"),
        });
      }
    })();

    return () => {
      cancelled = true;
    };
  }, [client, isInitialized]);

  useEffect(() => {
    if (!clientError) return;

    setState({
      sites: [],
      isLoading: false,
      error: clientError,
    });
  }, [clientError]);

  return state;
}
