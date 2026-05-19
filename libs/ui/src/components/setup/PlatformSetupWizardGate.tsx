"use client";

import type { ReactNode } from "react";

import { usePlatformConnectionStatus } from "../../hooks/usePlatformConnectionStatus";
import { usePlatformSetup } from "../../hooks/usePlatformSetup";
import { FullScreenLoading } from "../ui/full-screen-loading";
import { PlatformSetupWizard, type PlatformSetupWizardProps } from "./PlatformSetupWizard";

type PlatformSetupWizardGateProps = PlatformSetupWizardProps & {
  children: ReactNode;
};

export function PlatformSetupWizardGate({
  children,
  ...wizardProps
}: PlatformSetupWizardGateProps) {
  const { data: status, isPending: statusPending } = usePlatformConnectionStatus();
  const {
    data: setupResponse,
    isPending: setupPending,
    isFetching: setupFetching,
  } = usePlatformSetup();

  const complete = Boolean(setupResponse?.setup?.setupCompletedAt);
  const hasSetupRow = setupResponse?.setup != null;

  if (statusPending) return <FullScreenLoading />;
  if (!status?.connected) return null;
  if (setupPending) return <FullScreenLoading />;
  if (complete) return <>{children}</>;
  if (setupFetching && !hasSetupRow) return <FullScreenLoading />;
  return <PlatformSetupWizard {...wizardProps} />;
}
