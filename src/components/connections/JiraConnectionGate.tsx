"use client";

import type { ReactNode } from "react";

import { FullScreenLoading } from "@/components/ui/full-screen-loading";
import { useJiraConnectionStatus } from "@/hooks/useJiraConnectionStatus";

import ConnectionScreen from "./ConnectionScreen";

type JiraConnectionGateProps = {
  /**
   * Shown when Jira is connected (e.g. setup gate wrapping main task manager UI).
   */
  children: ReactNode;
};

/**
 * Renders the Jira connect experience until the user is connected, then `children`.
 * Does not know about setup — nest SetupWizardGate inside for setup vs. main app.
 */
export function JiraConnectionGate({ children }: JiraConnectionGateProps) {
  const {
    data: status,
    isLoading: statusLoading,
    isRefetching: statusRefetching,
  } = useJiraConnectionStatus();

  if (statusLoading || (!status?.connected && statusRefetching)) {
    return <FullScreenLoading />;
  }

  if (status?.connected) {
    return <>{children}</>;
  }

  return <ConnectionScreen />;
}
