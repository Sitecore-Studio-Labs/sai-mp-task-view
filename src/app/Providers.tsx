"use client";

import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import axios from "axios";
import { useState } from "react";
import { JiraAuthFailureProvider } from "@/providers/auth-providers/JiraAuthFailureProvider";

const retryUnless401 = (failureCount: number, error: Error) => {
  if (axios.isAxiosError(error) && error.response?.status === 401) return false;
  return failureCount < 1;
};

/**
 * Client-only provider that creates QueryClient on the client.
 * QueryClient is a class and cannot be passed from Server Components.
 */
export function Providers({ children }: { children: React.ReactNode }) {
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
      })
  );

  return (
    <QueryClientProvider client={queryClient}>
      <JiraAuthFailureProvider>{children}</JiraAuthFailureProvider>
    </QueryClientProvider>
  );
}
