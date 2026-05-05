"use client";

import type { ReactNode } from "react";

import { FullScreenLoading } from "@/components/ui/full-screen-loading";
import { useJiraConnectionStatus } from "@/hooks/useJiraConnectionStatus";
import { useSetup } from "@/hooks/useSetup";

import SetupWizard from "./SetupWizard";

type SetupWizardGateProps = {
  /** Main task manager UI (status bar, layout) — only after setup is complete. */
  children: ReactNode;
};

/**
 * For users who are already Jira-connected: shows the setup wizard until `setup_completed_at`
 * is set, then `children`. If not connected, the parent JiraConnectionGate should not render this.
 */
export function SetupWizardGate({ children }: SetupWizardGateProps) {
  const { data: jiraStatus, isPending: jiraPending } = useJiraConnectionStatus();
  const { data: setupResponse, isPending: setupPending, isFetching: setupFetching } = useSetup();

  const complete = Boolean(setupResponse?.setup?.setup_completed_at);
  /** User has a persisted `jira_user_setup` row (may still be in-progress, i.e. not completed). */
  const hasSetupRow = setupResponse?.setup != null;

  if (jiraPending) {
    return <FullScreenLoading />;
  }
  if (!jiraStatus?.connected) {
    return null;
  }
  if (setupPending) {
    return <FullScreenLoading />;
  }
  if (complete) {
    return <>{children}</>;
  }
  // Refetch with no setup row in cache: stale "empty" snapshot may update to a completed
  // `setup` — don’t mount the wizard until the request settles to avoid a one-frame flash.
  if (setupFetching && !hasSetupRow) {
    return <FullScreenLoading />;
  }
  return <SetupWizard />;
}
