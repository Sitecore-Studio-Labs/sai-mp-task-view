import type { EventSeverity } from "../types/events";
import { METRIC } from "../types/metrics";
import { ObservabilityClient } from "./client";

export interface ErrorReportOptions {
  severity?: EventSeverity;
  errorCode?: string;
  componentStack?: string;
  platform?: string;
  properties?: Record<string, string | number | boolean>;
}

/**
 * Reports an error to the ObservabilityClient with structured metadata.
 * Use this for known error surfaces (API failures, boundary catches, auth errors).
 * All args are optional beyond the error itself — context enriches dashboards but is not required.
 */
export function reportError(error: Error, options: ErrorReportOptions = {}): void {
  const client = ObservabilityClient.getInstance();
  client.trackError(METRIC.ERROR_UNHANDLED, error, {
    severity: options.severity ?? "error",
    errorCode: options.errorCode,
    platform: options.platform,
    properties: {
      ...(options.componentStack ? { componentStack: options.componentStack.slice(0, 300) } : {}),
      ...(options.properties ?? {}),
    },
  });
}

/**
 * Reports a React error boundary catch. Tracks METRIC.ERROR_BOUNDARY_TRIGGERED
 * in addition to the base error event so dashboards can filter boundary vs. network errors.
 */
export function reportBoundaryError(error: Error, componentStack: string): void {
  const client = ObservabilityClient.getInstance();

  client.track({
    eventName: METRIC.ERROR_BOUNDARY_TRIGGERED,
    category: "error",
    severity: "error",
    errorStack: process.env.NODE_ENV !== "production" ? error.stack : undefined,
    properties: {
      errorMessage: error.message.slice(0, 200),
      componentStack: componentStack.slice(0, 300),
    },
  });
}
