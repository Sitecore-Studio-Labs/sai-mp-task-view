"use client";

import { createObservabilityClient } from "@mp/observability";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import axios from "axios";
import { useEffect, useState } from "react";

import { JiraAuthFailureProvider } from "@/providers/auth-providers/JiraAuthFailureProvider";
import { JiraPlatformApiProvider } from "@/providers/JiraPlatformApiProvider";

const retryUnless401 = (failureCount: number, error: Error) => {
  if (axios.isAxiosError(error) && error.response?.status === 401) return false;
  return failureCount < 1;
};

/**
 * Client-only provider that creates QueryClient on the client.
 * QueryClient is a class and cannot be passed from Server Components.
 */
export function Providers({ children }: { children: React.ReactNode }) {
  useEffect(() => {
    createObservabilityClient({
      platform: "jira",
      appVersion: process.env.NEXT_PUBLIC_APP_VERSION,
    });
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
