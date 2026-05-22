// ── Factory ───────────────────────────────────────────────────────────────────
export type { ObservabilityConfig } from "./createObservabilityClient";
export { createObservabilityClient } from "./createObservabilityClient";

// ── Core ─────────────────────────────────────────────────────────────────────
export type { ClientInitOptions, Span, Tracer } from "./core/client";
export { ObservabilityClient } from "./core/client";
export type { ErrorReportOptions } from "./core/error-reporter";
export { reportBoundaryError, reportError } from "./core/error-reporter";
export type { Logger, LoggerContext } from "./core/logger";
export { createLogger, rootLogger } from "./core/logger";
export { ThresholdMonitor } from "./core/threshold-monitor";

// ── Middleware ────────────────────────────────────────────────────────────────
export { withObservability } from "./middleware/withObservability";

// ── Types ────────────────────────────────────────────────────────────────────
export type { EventCategory, EventSeverity, ObservabilityEvent } from "./types/events";
export type { LogLevel, LogRecord } from "./types/logger";
export type { MetricName } from "./types/metrics";
export { METRIC } from "./types/metrics";

// ── Exporters ────────────────────────────────────────────────────────────────
export type { BaseExporter } from "./exporters/base";
export { ConsoleExporter } from "./exporters/console";
export { GoogleAnalyticsExporter } from "./exporters/google-analytics";
export { OtlpExporter } from "./exporters/otlp";
export { VercelAnalyticsExporter } from "./exporters/vercel";

// ── Tracer ────────────────────────────────────────────────────────────────────
export { getOtelTracer } from "./core/tracer";

// ── Capability filter ────────────────────────────────────────────────────────
export type { CapabilityFlags } from "./events/capability-filter";
export { shouldTrackEvent } from "./events/capability-filter";

// ── Config ────────────────────────────────────────────────────────────────────
export { AI_TIME_SAVED_PER_SUBTASK_MIN } from "./config/constants";

// ── Event builders ────────────────────────────────────────────────────────────
export { createBusinessEvents } from "./events/business";
export { createTechnicalEvents } from "./events/technical";

// ── Hooks ─────────────────────────────────────────────────────────────────────
export { useEventTracker } from "./hooks/useEventTracker";
export { usePageTracking } from "./hooks/usePageTracking";
export { useOperationTimer, usePerformanceTracker } from "./hooks/usePerformanceTracker";
