"use client";

import { PlatformApiProvider } from "@mp/task-core";
import type { ReactNode } from "react";

import { JIRA_API_PATHS } from "@/lib/apiPaths";
import { apiClient } from "@/lib/axiosClient";

export function JiraPlatformApiProvider({ children }: { children: ReactNode }) {
  return (
    <PlatformApiProvider paths={JIRA_API_PATHS} client={apiClient}>
      {children}
    </PlatformApiProvider>
  );
}
