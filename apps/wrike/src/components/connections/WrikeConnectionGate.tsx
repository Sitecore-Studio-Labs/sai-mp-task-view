"use client";

import { ConnectionScreen, FullScreenLoading, usePlatformConnectionStatus } from "@mp/ui";
import type { ReactNode } from "react";

import { ConnectWrikeButton } from "./ConnectWrikeButton";

export function WrikeConnectionGate({ children }: { children: ReactNode }) {
  const { data: status, isLoading } = usePlatformConnectionStatus();

  if (isLoading) return <FullScreenLoading />;
  if (!status?.connected) {
    return <ConnectionScreen connected={false} connectButton={<ConnectWrikeButton />} />;
  }

  return <>{children}</>;
}
