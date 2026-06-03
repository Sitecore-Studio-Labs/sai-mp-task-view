"use client";

import { useEffect } from "react";

import { ObservabilityClient } from "../core/client";
import { METRIC } from "../types/metrics";

/**
 * Collects Core Web Vitals from the browser and tracks them as observability events.
 *
 * Metrics collected:
 *   - LCP  (Largest Contentful Paint)  — loading performance
 *   - CLS  (Cumulative Layout Shift)   — visual stability
 *   - INP  (Interaction to Next Paint) — responsiveness
 *   - TTFB (Time to First Byte)        — server response time
 *
 * All metrics flow through ObservabilityClient so they reach every configured
 * exporter (Vercel Analytics, OTLP, Prometheus, GA, Console).
 *
 * Uses the `web-vitals` package which ships with Next.js — no extra dependency.
 *
 * Usage:
 *   // In your root layout or page:
 *   import { useWebVitals } from "@mp/observability";
 *   useWebVitals("jira");
 */
export function useWebVitals(platform: string): void {
  useEffect(() => {
    const client = ObservabilityClient.getInstance();
    if (!client) return;

    // Dynamic import keeps the web-vitals code out of the critical path.
    import("web-vitals")
      .then(({ onLCP, onCLS, onINP, onTTFB }) => {
        onLCP((metric) => {
          client.track({
            eventName: METRIC.WEB_VITALS_LCP,
            category: "performance",
            duration: Math.round(metric.value),
            properties: {
              platform,
              rating: metric.rating, // "good" | "needs-improvement" | "poor"
              navigationType: metric.navigationType ?? "navigate",
            },
          });
        });

        onCLS((metric) => {
          client.track({
            eventName: METRIC.WEB_VITALS_CLS,
            category: "performance",
            properties: {
              platform,
              // CLS is unitless score (0–infinity), multiply by 1000 for integer storage
              score: Math.round(metric.value * 1000),
              rating: metric.rating,
            },
          });
        });

        onINP((metric) => {
          client.track({
            eventName: METRIC.WEB_VITALS_INP,
            category: "performance",
            duration: Math.round(metric.value),
            properties: {
              platform,
              rating: metric.rating,
            },
          });
        });

        onTTFB((metric) => {
          client.track({
            eventName: METRIC.WEB_VITALS_TTFB,
            category: "performance",
            duration: Math.round(metric.value),
            properties: {
              platform,
              rating: metric.rating,
            },
          });
        });
      })
      .catch(() => {
        // web-vitals not available in this environment (e.g. test)
      });
    // platform is intentionally not in deps — only fire once on mount
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);
}
