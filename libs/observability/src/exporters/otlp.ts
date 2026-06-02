import type { ObservabilityEvent } from "../types/events";
import type { LogRecord } from "../types/logger";
import type { BaseExporter } from "./base";

/**
 * Sends events and logs to any OTLP-compatible backend.
 *
 * Signal routing (industry standard):
 *   Business / page / error events → POST /v1/logs   (OTLP Logs)
 *   Performance spans (startSpan)  → POST /v1/traces  (OTLP Traces, via Tracer)
 *
 * Compatible backends: Grafana Tempo+Loki, Honeycomb, Jaeger, Datadog, New Relic.
 * Silently no-ops when OTEL_EXPORTER_OTLP_ENDPOINT is not set.
 *
 * Environment variables:
 *   OTEL_EXPORTER_OTLP_ENDPOINT  — base URL, e.g. https://tempo.example.com
 *   OTEL_EXPORTER_OTLP_HEADERS   — comma-separated "key=value" auth headers
 *                                   e.g. "Authorization=Bearer <token>"
 */
export class OtlpExporter implements BaseExporter {
  readonly name = "otlp";

  private readonly endpoint: string | undefined;
  private readonly headers: Record<string, string>;

  constructor() {
    this.endpoint = process.env.OTEL_EXPORTER_OTLP_ENDPOINT;
    this.headers = parseHeadersEnv(process.env.OTEL_EXPORTER_OTLP_HEADERS);
  }

  /**
   * Export a business / page / error event as an OTLP Log record.
   * Log records are the correct signal for discrete events — not traces.
   */
  export(event: ObservabilityEvent): void {
    if (!this.endpoint) return;
    this.postJson(`${this.endpoint.replace(/\/$/, "")}/v1/logs`, buildOtlpLogsPayload(event));
  }

  /**
   * Export a structured server log as an OTLP Log record.
   */
  exportLog(record: LogRecord): void {
    if (!this.endpoint) return;
    this.postJson(`${this.endpoint.replace(/\/$/, "")}/v1/logs`, buildOtlpLogRecord(record));
  }

  /**
   * Export a distributed trace span. Called by the OTel tracer integration,
   * not by ObservabilityClient.track() directly.
   */
  exportSpan(span: OtlpSpan): void {
    if (!this.endpoint) return;
    this.postJson(`${this.endpoint.replace(/\/$/, "")}/v1/traces`, buildOtlpTracesPayload(span));
  }

  private postJson(url: string, body: unknown): void {
    // Fire-and-forget — never block the request path.
    // Uses sendBeacon when available (page-unload safe), falls back to fetch.
    const json = JSON.stringify(body);
    const headers = { "Content-Type": "application/json", ...this.headers };

    if (typeof navigator !== "undefined" && navigator.sendBeacon && !this.hasAuthHeader()) {
      // sendBeacon works only without custom headers; use it for client-side
      const blob = new Blob([json], { type: "application/json" });
      navigator.sendBeacon(url, blob);
      return;
    }

    fetch(url, { method: "POST", headers, body: json }).catch(() => {
      // swallow — exporter errors must never propagate
    });
  }

  private hasAuthHeader(): boolean {
    return "Authorization" in this.headers || "authorization" in this.headers;
  }
}

// ── OTLP Logs payload ─────────────────────────────────────────────────────────

function buildOtlpLogsPayload(event: ObservabilityEvent) {
  const nowNs = BigInt(event.timestamp) * BigInt(1_000_000);
  const severityMap: Record<string, number> = {
    info: 9,
    warn: 13,
    error: 17,
    critical: 21,
  };

  return {
    resourceLogs: [
      {
        resource: {
          attributes: otlpAttrs({
            "service.name": event.platform,
            "service.version": event.appVersion,
          }),
        },
        scopeLogs: [
          {
            scope: { name: "mp-observability", version: "1.0.0" },
            logRecords: [
              {
                timeUnixNano: nowNs.toString(),
                observedTimeUnixNano: nowNs.toString(),
                severityNumber: severityMap[event.severity ?? "info"] ?? 9,
                severityText: event.severity ?? "INFO",
                body: { stringValue: event.eventName },
                attributes: otlpAttrs({
                  "event.name": event.eventName,
                  "event.category": event.category,
                  "session.id": event.sessionId,
                  ...(event.userId ? { "user.id": event.userId } : {}),
                  ...(event.duration !== undefined ? { "event.duration_ms": event.duration } : {}),
                  ...(event.errorCode ? { "error.code": event.errorCode } : {}),
                  ...flattenProperties(event.properties),
                }),
              },
            ],
          },
        ],
      },
    ],
  };
}

function buildOtlpLogRecord(record: LogRecord) {
  const nowNs = BigInt(new Date(record.timestamp).getTime()) * BigInt(1_000_000);
  const severityMap: Record<string, number> = {
    debug: 5,
    info: 9,
    warn: 13,
    error: 17,
    fatal: 21,
  };
  return {
    resourceLogs: [
      {
        resource: {
          attributes: otlpAttrs({
            "service.name": record.platform ?? "platform",
          }),
        },
        scopeLogs: [
          {
            scope: { name: "mp-observability/logger", version: "1.0.0" },
            logRecords: [
              {
                timeUnixNano: nowNs.toString(),
                observedTimeUnixNano: nowNs.toString(),
                severityNumber: severityMap[record.level] ?? 9,
                severityText: record.level.toUpperCase(),
                body: { stringValue: record.message },
                attributes: otlpAttrs({
                  ...(record.requestId ? { "request.id": record.requestId } : {}),
                  ...(record.error ? { "error.message": record.error.message } : {}),
                  ...flattenFields(record.fields),
                }),
              },
            ],
          },
        ],
      },
    ],
  };
}

// ── OTLP Traces payload (for actual spans, not events) ────────────────────────

export interface OtlpSpan {
  name: string;
  traceId: string;
  spanId: string;
  startTimeMs: number;
  endTimeMs: number;
  platform: string;
  appVersion?: string;
  attributes?: Record<string, string | number | boolean>;
  statusCode?: "ok" | "error";
}

function buildOtlpTracesPayload(span: OtlpSpan) {
  const startNs = BigInt(span.startTimeMs) * BigInt(1_000_000);
  const endNs = BigInt(span.endTimeMs) * BigInt(1_000_000);

  return {
    resourceSpans: [
      {
        resource: {
          attributes: otlpAttrs({
            "service.name": span.platform,
            "service.version": span.appVersion ?? "unknown",
          }),
        },
        scopeSpans: [
          {
            scope: { name: "mp-observability", version: "1.0.0" },
            spans: [
              {
                traceId: span.traceId,
                spanId: span.spanId,
                name: span.name,
                kind: 1, // SPAN_KIND_INTERNAL
                startTimeUnixNano: startNs.toString(),
                endTimeUnixNano: endNs.toString(),
                attributes: otlpAttrs(span.attributes ?? {}),
                status: { code: span.statusCode === "error" ? 2 : 1 },
              },
            ],
          },
        ],
      },
    ],
  };
}

// ── Helpers ───────────────────────────────────────────────────────────────────

function parseHeadersEnv(raw: string | undefined): Record<string, string> {
  if (!raw) return {};
  return Object.fromEntries(
    raw.split(",").map((pair) => {
      const idx = pair.indexOf("=");
      return idx === -1
        ? [pair.trim(), ""]
        : [pair.slice(0, idx).trim(), pair.slice(idx + 1).trim()];
    }),
  );
}

function otlpAttrs(obj: Record<string, string | number | boolean | undefined>) {
  return Object.entries(obj)
    .filter(([, v]) => v !== undefined)
    .map(([key, value]) => {
      if (typeof value === "number") return { key, value: { doubleValue: value } };
      if (typeof value === "boolean") return { key, value: { boolValue: value } };
      return { key, value: { stringValue: String(value) } };
    });
}

function flattenProperties(props: Record<string, string | number | boolean>) {
  return Object.fromEntries(Object.entries(props).map(([k, v]) => [`props.${k}`, v]));
}

function flattenFields(fields: Record<string, unknown> | undefined) {
  if (!fields) return {};
  return Object.fromEntries(
    Object.entries(fields)
      .filter(([, v]) => typeof v === "string" || typeof v === "number" || typeof v === "boolean")
      .map(([k, v]) => [`fields.${k}`, v as string | number | boolean]),
  );
}
