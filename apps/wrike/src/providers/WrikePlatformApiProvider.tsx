"use client";

import { PlatformApiProvider } from "@mp/task-core";
import type { ReactNode } from "react";

import { WRIKE_API_PATHS } from "@/lib/apiPaths";
import { apiClient, setCurrentSiteId } from "@/lib/axiosClient";

export function WrikePlatformApiProvider({ children }: { children: ReactNode }) {
  return (
    <PlatformApiProvider paths={WRIKE_API_PATHS} client={apiClient} setSiteId={setCurrentSiteId}>
      {children}
    </PlatformApiProvider>
  );
}
