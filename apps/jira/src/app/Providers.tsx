"use client";

import { createObservabilityClient, METRIC, ObservabilityClient } from "@mp/observability";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import axios from "axios";
import { useEffect, useRef, useState } from "react";

import { JiraAuthFailureProvider } from "@/providers/auth-providers/JiraAuthFailureProvider";
import { JiraPlatformApiProvider } from "@/providers/JiraPlatformApiProvider";

const retryUnless401 = (failureCount: number, error: Error) => {
  if (axios.isAxiosError(error) && error.response?.status === 401) return false;
  return failureCount < 1;
};

/**
 * Client-only provider that:
 * 1. Initialises the ObservabilityClient with browser-appropriate exporters.
 * 2. Fires session.started on mount and session.ended on unmount.
 * 3. Sets up QueryClient for data fetching.
 */
export function Providers({ children }: { children: React.ReactNode }) {
  const sessionStartRef = useRef<number>(0);
  const actionCountRef = useRef<number>(0);

  useEffect(() => {
    // Initialise the observability client for this browser session.
    // Browser-appropriate exporters (Vercel Analytics, GA, Console) are
    // assembled automatically from env vars in buildDefaultExporters().
    createObservabilityClient({
      platform: "jira",
      appVersion: process.env.NEXT_PUBLIC_APP_VERSION,
    });

    const client = ObservabilityClient.getInstance();
    sessionStartRef.current = Date.now();

    // session.started populates the adoption funnel in Vercel Analytics
    // and the session.started event group in all other exporters.
    client.track({
      eventName: METRIC.SESSION_STARTED,
      category: "business",
      properties: {
        platform: "jira",
        appVersion: process.env.NEXT_PUBLIC_APP_VERSION ?? "unknown",
      },
    });

    // Track action count for session.ended (increment on any click)
    const onInteraction = () => {
      actionCountRef.current++;
    };
    document.addEventListener("click", onInteraction, { passive: true });

    // session.ended fires when the user leaves or closes the tab.
    const onVisibilityHide = () => {
      if (document.visibilityState !== "hidden") return;
      client.track({
        eventName: METRIC.SESSION_ENDED,
        category: "business",
        properties: {
          platform: "jira",
          durationMs: Date.now() - sessionStartRef.current,
          actionCount: actionCountRef.current,
        },
      });
      // Flush queued events before the page is torn down.
      client.flush().catch(() => {});
    };
    document.addEventListener("visibilitychange", onVisibilityHide);

    return () => {
      document.removeEventListener("click", onInteraction);
      document.removeEventListener("visibilitychange", onVisibilityHide);
    };
  }, []);

  const [queryClient] = useState(
    () =>
      new QueryClient({
        defaultOptions: {
          queries: {
            refetchOnWindowFocus: false,
            retry: retryUnless401,
          },
          mutations: {
            retry: retryUnless401,
          },
        },
      }),
  );

  return (
    <QueryClientProvider client={queryClient}>
      <JiraPlatformApiProvider>
        <JiraAuthFailureProvider>{children}</JiraAuthFailureProvider>
      </JiraPlatformApiProvider>
    </QueryClientProvider>
  );
}
