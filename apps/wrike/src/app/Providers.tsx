"use client";

import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import axios from "axios";
import { useState } from "react";

import { WrikeAuthFailureProvider } from "@/providers/auth-providers/WrikeAuthFailureProvider";
import { WrikePlatformApiProvider } from "@/providers/WrikePlatformApiProvider";

const retryUnless401 = (failureCount: number, error: Error) => {
  if (axios.isAxiosError(error) && error.response?.status === 401) return false;
  return failureCount < 1;
};

export function Providers({ children }: { children: React.ReactNode }) {
  const [queryClient] = useState(
    () =>
      new QueryClient({
        defaultOptions: {
          queries: { refetchOnWindowFocus: false, retry: retryUnless401 },
          mutations: { retry: retryUnless401 },
        },
      }),
  );

  return (
    <QueryClientProvider client={queryClient}>
      <WrikePlatformApiProvider>
        <WrikeAuthFailureProvider>{children}</WrikeAuthFailureProvider>
      </WrikePlatformApiProvider>
    </QueryClientProvider>
  );
}
