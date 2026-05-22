import { ObservabilityClient } from "./core/client";
import type { BaseExporter } from "./exporters/base";
import { ConsoleExporter } from "./exporters/console";
import { GoogleAnalyticsExporter } from "./exporters/google-analytics";
import { OtlpExporter } from "./exporters/otlp";
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
}

/**
 * Initialises the global ObservabilityClient singleton using environment variables
 * to select active exporters. Call once at app bootstrap (e.g. in Providers.tsx).
 *
 * Env vars (all optional):
 *   NEXT_PUBLIC_ENABLE_CONSOLE_LOGGING  — "true" to force console exporter in production
 *   NEXT_PUBLIC_GA_MEASUREMENT_ID       — enables Google Analytics exporter
 *   OTEL_EXPORTER_OTLP_ENDPOINT         — enables OTLP exporter (server-side only)
 *
 * ConsoleExporter is always active in development.
 * VercelAnalyticsExporter is always active (no-ops when @vercel/analytics is absent).
 */
export function createObservabilityClient(config: ObservabilityConfig): ObservabilityClient {
  const client = ObservabilityClient.getInstance();

  let exporters: BaseExporter[];

  if (config.exporters) {
    exporters = config.exporters;
  } else {
    exporters = buildDefaultExporters();
  }

  client.init({
    exporters,
    platform: config.platform,
    appVersion: config.appVersion ?? process.env.NEXT_PUBLIC_APP_VERSION ?? "dev",
  });

  return client;
}

function buildDefaultExporters(): BaseExporter[] {
  const exporters: BaseExporter[] = [];

  const isProduction = process.env.NODE_ENV === "production";
  const forceConsole = process.env.NEXT_PUBLIC_ENABLE_CONSOLE_LOGGING === "true";

  if (!isProduction || forceConsole) {
    exporters.push(new ConsoleExporter());
  }

  exporters.push(new VercelAnalyticsExporter());

  const gaMeasurementId = process.env.NEXT_PUBLIC_GA_MEASUREMENT_ID;
  if (gaMeasurementId) {
    exporters.push(new GoogleAnalyticsExporter(gaMeasurementId));
  }

  // OTLP exporter: only active server-side when endpoint is configured
  if (typeof window === "undefined" && process.env.OTEL_EXPORTER_OTLP_ENDPOINT) {
    exporters.push(new OtlpExporter());
  }

  return exporters;
}
