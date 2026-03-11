"use client";

import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { useState } from "react";
import { JiraAuthFailureProvider } from "@/providers/auth-providers/JiraAuthFailureProvider";

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
            retry: 1,
          },
          mutations: {
            retry: 1,
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
