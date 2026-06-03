"use client";

import { createContext, type ReactNode, useContext } from "react";

import type { PlatformCapabilities } from "../types/platform-capabilities";

const PlatformCapabilitiesContext = createContext<PlatformCapabilities | null>(null);

/**
 * Provides platform capabilities to all child components.
 * Wrap your platform-specific app root with this and supply the capabilities object.
 *
 * @example
 * // In apps/jira — wraps the extension page
 * <PlatformCapabilitiesProvider value={JIRA_CAPABILITIES}>
 *   <TaskManagerLayout />
 * </PlatformCapabilitiesProvider>
 */
export function PlatformCapabilitiesProvider({
  value,
  children,
}: {
  value: PlatformCapabilities;
  children: ReactNode;
}) {
  return (
    <PlatformCapabilitiesContext.Provider value={value}>
      {children}
    </PlatformCapabilitiesContext.Provider>
  );
}

/**
 * Returns the current platform's capabilities.
 * Must be rendered inside a PlatformCapabilitiesProvider.
 */
export function usePlatformCapabilities(): PlatformCapabilities {
  const ctx = useContext(PlatformCapabilitiesContext);
  if (!ctx) {
    throw new Error("usePlatformCapabilities must be used within a PlatformCapabilitiesProvider.");
  }
  return ctx;
}
