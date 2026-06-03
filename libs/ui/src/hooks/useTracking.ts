"use client";

import { useEventTracker } from "@mp/observability";
import { usePlatformCapabilities } from "@mp/task-core";

/**
 * Convenience hook that combines platform capabilities with event tracking.
 * Returns the same shape as useEventTracker but pre-bound to the current platform's
 * capability flags from PlatformCapabilitiesContext.
 *
 * Usage:
 *   const { business } = useTracking();
 *   business.featureUsed({ featureKey: "create-task", platform: "jira" });
 */
export function useTracking() {
  const capabilities = usePlatformCapabilities();
  return useEventTracker(capabilities);
}
