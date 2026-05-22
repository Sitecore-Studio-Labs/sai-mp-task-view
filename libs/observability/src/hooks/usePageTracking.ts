"use client";

import { useEffect } from "react";

import { ObservabilityClient } from "../core/client";
import { METRIC } from "../types/metrics";

/**
 * Tracks a PAGE_VIEWED event once on mount.
 * Use at the top of page components or layout subtrees.
 *
 * @param pageName  Human-readable name, e.g. "task-manager-extension"
 * @param properties  Optional additional dimensions
 */
export function usePageTracking(
  pageName: string,
  properties: Record<string, string | number | boolean> = {},
): void {
  useEffect(() => {
    ObservabilityClient.getInstance().track({
      eventName: METRIC.PAGE_VIEWED,
      category: "page",
      properties: { page: pageName, ...properties },
    });
    // Only fire on mount — pageName is intentionally excluded from deps
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);
}
