import { ObservabilityClient } from "../core/client";
import { METRIC } from "../types/metrics";

/**
 * Technical / infrastructure event helpers.
 * These are always tracked regardless of capability flags.
 */
export function createTechnicalEvents() {
  const client = ObservabilityClient.getInstance();

  return {
    connectionEstablished: (props: { platform: string }) =>
      client.track({
        eventName: METRIC.CONNECTION_CONNECTED,
        category: "user_action",
        properties: props,
      }),

    connectionRevoked: (props: { platform: string }) =>
      client.track({
        eventName: METRIC.CONNECTION_DISCONNECTED,
        category: "user_action",
        properties: props,
      }),

    authRefreshFailed: (props: { reason: string }) =>
      client.track({
        eventName: METRIC.AUTH_REFRESH_FAILED,
        category: "error",
        severity: "error",
        properties: props,
      }),

    authTokenExpired: () =>
      client.track({
        eventName: METRIC.AUTH_TOKEN_EXPIRED,
        category: "error",
        severity: "warn",
        properties: {},
      }),

    errorBoundaryTriggered: (props: { componentStack: string; errorMessage: string }) =>
      client.track({
        eventName: METRIC.ERROR_BOUNDARY_TRIGGERED,
        category: "error",
        severity: "error",
        properties: {
          componentStack: props.componentStack.slice(0, 200),
          errorMessage: props.errorMessage.slice(0, 200),
        },
      }),
  };
}
