"use client";

import { useEffect, useRef } from "react";

import { ObservabilityClient } from "../core/client";
import { METRIC } from "../types/metrics";

const SLOW_RENDER_THRESHOLD_MS = 500;

/**
 * Tracks component mount time and emits a SLOW_RENDER event when mount exceeds
 * SLOW_RENDER_THRESHOLD_MS. Use on heavy components like task lists and details views.
 *
 * @param componentName  Dot-namespaced component label, e.g. "task-manager.task-list"
 */
export function usePerformanceTracker(componentName: string): void {
  const startRef = useRef<number>(
    typeof performance !== "undefined" ? performance.now() : Date.now(),
  );

  useEffect(() => {
    const mountDuration = Math.round(
      (typeof performance !== "undefined" ? performance.now() : Date.now()) - startRef.current,
    );

    if (mountDuration > SLOW_RENDER_THRESHOLD_MS) {
      ObservabilityClient.getInstance().track({
        eventName: METRIC.RENDER_SLOW,
        category: "performance",
        severity: "warn",
        duration: mountDuration,
        properties: {
          component: componentName,
          threshold: SLOW_RENDER_THRESHOLD_MS,
        },
      });
    }
    // Only track on initial mount
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);
}

/**
 * Returns a timing function for measuring and reporting async operation latency.
 * Call `start()` before the operation and `end(label)` after it resolves.
 *
 * Emits METRIC.SLOW_API_CALL when the duration exceeds the threshold.
 *
 * @param threshold  Milliseconds before a slow event fires (default: 3000)
 */
export function useOperationTimer(threshold = 3000) {
  const startRef = useRef<number>(0);

  return {
    start(): void {
      startRef.current = typeof performance !== "undefined" ? performance.now() : Date.now();
    },
    end(operationName: string): number {
      const duration = Math.round(
        (typeof performance !== "undefined" ? performance.now() : Date.now()) - startRef.current,
      );
      if (duration > threshold) {
        ObservabilityClient.getInstance().track({
          eventName: METRIC.API_SLOW,
          category: "performance",
          severity: "warn",
          duration,
          properties: {
            operation: operationName,
            threshold,
          },
        });
      }
      return duration;
    },
  };
}
