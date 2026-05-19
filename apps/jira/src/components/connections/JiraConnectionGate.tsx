"use client";

import { FullScreenLoading } from "@mp/ui";
import type { ReactNode } from "react";

import { useJiraConnectionStatus } from "@/hooks/useJiraConnectionStatus";

import ConnectionScreen from "./ConnectionScreen";

type JiraConnectionGateProps = {
  children: ReactNode;
};

/**
 * Renders the Jira connect experience until the user is connected, then renders children.
 * Does not know about setup — nest the shared PlatformSetupWizardGate inside for the setup → main app flow.
 */
export function JiraConnectionGate({ children }: JiraConnectionGateProps) {
  const { data: status, isLoading: statusLoading } = useJiraConnectionStatus();

  if (statusLoading) {
    return <FullScreenLoading />;
  }

  if (status?.connected) {
    return <>{children}</>;
  }

  return <ConnectionScreen />;
}
