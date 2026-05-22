import { track } from "@vercel/analytics";

import type { ObservabilityEvent } from "../types/events";
import type { BaseExporter } from "./base";

export class VercelAnalyticsExporter implements BaseExporter {
  readonly name = "vercel-analytics";

  export(event: ObservabilityEvent): void {
    if (typeof window === "undefined") return;
    try {
      track(event.eventName, {
        platform: event.platform,
        category: event.category,
        ...(event.duration !== undefined ? { durationMs: event.duration } : {}),
        ...event.properties,
      });
    } catch {
      // no-op: analytics unavailable in this environment
    }
  }
}
