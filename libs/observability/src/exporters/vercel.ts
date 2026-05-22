import type { ObservabilityEvent } from "../types/events";
import type { BaseExporter } from "./base";

/**
 * Forwards events to Vercel Analytics via its `track()` function.
 * Only active when `@vercel/analytics` is present — falls back silently otherwise.
 * This exporter is client-side only; server-side API calls go through Pino.
 */
export class VercelAnalyticsExporter implements BaseExporter {
  readonly name = "vercel-analytics";

  export(event: ObservabilityEvent): void {
    try {
      // Dynamic import avoids bundling in environments without @vercel/analytics
      // eslint-disable-next-line @typescript-eslint/no-require-imports
      const { track } = require("@vercel/analytics") as {
        track: (name: string, props?: Record<string, string | number | boolean>) => void;
      };
      track(event.eventName, {
        platform: event.platform,
        category: event.category,
        ...(event.duration !== undefined ? { durationMs: event.duration } : {}),
        ...event.properties,
      });
    } catch {
      // @vercel/analytics not installed or not available in this environment
    }
  }
}
