"use client";

import { usePlatformCapabilities } from "@mp/task-core";
import type { ReactNode } from "react";

interface ConnectionScreenProps {
  /** Whether the platform is already connected. If true, renders nothing. */
  connected: boolean;
  /** Platform-specific connect/auth button rendered below the description. */
  connectButton: ReactNode;
}

/**
 * Platform-agnostic not-connected landing screen.
 * Reads logo, title, and description from PlatformCapabilitiesContext.
 * Render inside a PlatformCapabilitiesProvider with the platform's config.
 *
 * @example
 * // apps/jira — wraps with Jira data
 * <ConnectionScreen
 *   connected={status?.connected ?? false}
 *   connectButton={<ConnectJiraButton />}
 * />
 */
export function ConnectionScreen({ connected, connectButton }: ConnectionScreenProps) {
  const { platformLogo, connectionTitle, connectionDescription } = usePlatformCapabilities();

  if (connected) return null;

  return (
    <div className="wrapper flex h-full flex-col items-center justify-center gap-2 text-center">
      {platformLogo && <div className="mb-4 size-20">{platformLogo}</div>}
      <h1 className="text-lg font-bold" data-testid="connect-to-platform">
        {connectionTitle}
      </h1>
      <p className="text-muted-foreground mb-4 text-sm">{connectionDescription}</p>
      {connectButton}
    </div>
  );
}
