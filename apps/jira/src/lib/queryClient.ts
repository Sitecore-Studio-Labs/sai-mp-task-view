import { QueryClient } from "@tanstack/react-query";

// Shared QueryClient instance for the app.
// You can further customize retry, cache times, etc. here.
export const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      refetchOnWindowFocus: false,
      retry: 1,
    },
    mutations: {
      retry: 0,
    },
  },
});
