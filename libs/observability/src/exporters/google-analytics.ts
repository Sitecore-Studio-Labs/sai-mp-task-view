import type { ObservabilityEvent } from "../types/events";
import type { BaseExporter } from "./base";

declare global {
  interface Window {
    gtag?: (...args: unknown[]) => void;
    dataLayer?: unknown[];
  }
}

/**
 * Forwards events to Google Analytics 4 via the gtag() function.
 * Only active when NEXT_PUBLIC_GA_MEASUREMENT_ID is set and gtag is loaded.
 *
 * The GA script is injected once on initialize() — no separate `<Script>` tag needed.
 * In test and server environments this exporter is a safe no-op.
 *
 * Usage:
 *   new GoogleAnalyticsExporter("G-XXXXXXXXXX")
 */
export class GoogleAnalyticsExporter implements BaseExporter {
  readonly name = "google-analytics";
  private readonly measurementId: string;
  private initialized = false;

  constructor(measurementId: string) {
    this.measurementId = measurementId;
  }

  initialize(): void {
    if (typeof window === "undefined" || !this.measurementId) return;
    if (this.initialized) return;

    // Inject gtag script if not already present
    if (!document.getElementById("gtag-script")) {
      const script = document.createElement("script");
      script.id = "gtag-script";
      script.async = true;
      script.src = `https://www.googletagmanager.com/gtag/js?id=${this.measurementId}`;
      document.head.appendChild(script);
    }

    window.dataLayer = window.dataLayer ?? [];
    window.gtag = function (...args: unknown[]) {
      window.dataLayer!.push(args);
    };
    window.gtag("js", new Date());
    window.gtag("config", this.measurementId, { send_page_view: false });

    this.initialized = true;
  }

  export(event: ObservabilityEvent): void {
    if (typeof window === "undefined" || !window.gtag) return;

    // Map page.viewed to GA page_view; everything else to a GA custom event
    if (event.eventName === "page.viewed") {
      window.gtag("event", "page_view", {
        page_title: event.properties["page"] ?? "unknown",
        page_location: typeof window !== "undefined" ? window.location.href : undefined,
      });
      return;
    }

    // GA4 event names: replace dots with underscores, max 40 chars
    const gaEventName = event.eventName.replace(/\./g, "_").slice(0, 40);

    window.gtag("event", gaEventName, {
      platform: event.platform,
      category: event.category,
      ...sanitizeForGa(event.properties),
    });
  }
}

function sanitizeForGa(
  props: Record<string, string | number | boolean>,
): Record<string, string | number | boolean> {
  // GA4 custom event params: max 25 keys, values max 100 chars for strings
  return Object.fromEntries(
    Object.entries(props)
      .slice(0, 25)
      .map(([k, v]) => [
        k.replace(/[^a-zA-Z0-9_]/g, "_").slice(0, 40),
        typeof v === "string" ? v.slice(0, 100) : v,
      ]),
  );
}
