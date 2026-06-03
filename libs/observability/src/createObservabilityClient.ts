import { ObservabilityClient } from "./core/client";
import type { BaseExporter } from "./exporters/base";
import { ConsoleExporter } from "./exporters/console";
import { GoogleAnalyticsExporter } from "./exporters/google-analytics";
import { OtlpExporter } from "./exporters/otlp";
import { PrometheusExporter } from "./exporters/prometheus";
import { VercelAnalyticsExporter } from "./exporters/vercel";

export interface ObservabilityConfig {
  /** Platform identifier, e.g. "jira" */
  platform: string;
  /** Semver or git SHA; falls back to "dev" */
  appVersion?: string;
  /**
   * Override exporters completely — useful in tests.
   * When omitted, exporters are auto-selected from env vars.
   */
  exporters?: BaseExporter[];
  /**
   * Sampling rate between 0.0 (drop all) and 1.0 (keep all). Default: 1.0.
   * Applied before any exporter receives the event. Useful in high-traffic
   * production to reduce analytics costs without losing structural coverage.
   *
   * Recommended values:
   *   1.0  — development and staging (keep everything)
   *   0.1  — busy production (1 in 10 events)
   *   0.01 — very high traffic (1 in 100 events)
   *
   * Error and alert events are NEVER sampled — they always pass through.
   */
  sampleRate?: number;
}

/**
 * Initialises the global ObservabilityClient singleton.
 *
 * Call once at app bootstrap — client-side from Providers.tsx,
 * server-side from instrumentation.ts.
 *
 * Exporters are auto-selected from env vars when `config.exporters` is omitted.
 *
 * Env vars (all optional):
 *   NEXT_PUBLIC_ENABLE_CONSOLE_LOGGING  — "true" to force console exporter in production
 *   NEXT_PUBLIC_GA_MEASUREMENT_ID       — enables Google Analytics exporter
 *   OTEL_EXPORTER_OTLP_ENDPOINT         — enables OTLP exporter (works on both sides)
 *
 * ConsoleExporter  — always active in development.
 * VercelAnalyticsExporter — browser-only (guarded by typeof window check inside).
 * PrometheusExporter      — server-only (exposes /api/metrics scrape endpoint).
 * OtlpExporter            — active on both sides when endpoint is configured.
 * GoogleAnalyticsExporter — browser-only, active when NEXT_PUBLIC_GA_MEASUREMENT_ID is set.
 */
export function createObservabilityClient(config: ObservabilityConfig): ObservabilityClient {
  const client = ObservabilityClient.getInstance();

  const exporters = config.exporters ?? buildDefaultExporters();

  client.init({
    exporters,
    platform: config.platform,
    appVersion: config.appVersion ?? process.env.NEXT_PUBLIC_APP_VERSION ?? "dev",
    sampleRate: config.sampleRate ?? 1.0,
  });

  return client;
}

function buildDefaultExporters(): BaseExporter[] {
  const exporters: BaseExporter[] = [];

  const isProduction = process.env.NODE_ENV === "production";
  const forceConsole = process.env.NEXT_PUBLIC_ENABLE_CONSOLE_LOGGING === "true";
  const isServer = typeof window === "undefined";

  if (!isProduction || forceConsole) {
    exporters.push(new ConsoleExporter());
  }

  // ── Browser-only exporters ────────────────────────────────────────────────
  if (!isServer) {
    // Vercel Analytics: tracks custom events in the Vercel Dashboard.
    // Requires Analytics to be enabled in the Vercel project settings:
    // Dashboard → your project → Analytics → Enable Web Analytics
    exporters.push(new VercelAnalyticsExporter());

    const gaMeasurementId = process.env.NEXT_PUBLIC_GA_MEASUREMENT_ID;
    if (gaMeasurementId) {
      exporters.push(new GoogleAnalyticsExporter(gaMeasurementId));
    }
  }

  // ── Server-only exporters ─────────────────────────────────────────────────
  if (isServer) {
    // PrometheusExporter: maintains in-process counters/histograms.
    // Exposed via GET /api/metrics for Prometheus/Grafana scraping.
    exporters.push(PrometheusExporter.getInstance());
  }

  // ── Both sides (when configured) ─────────────────────────────────────────
  if (process.env.OTEL_EXPORTER_OTLP_ENDPOINT) {
    // Routes events to /v1/logs and logs to /v1/logs.
    // Traces (spans) go to /v1/traces via the OtelTracer.
    exporters.push(new OtlpExporter());
  }

  return exporters;
}
