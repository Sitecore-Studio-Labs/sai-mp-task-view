import type { ObservabilityEvent } from "../types/events";
import type { BaseExporter } from "./base";

/**
 * Sends events to any OTLP-compatible backend (Grafana Tempo, Jaeger, Honeycomb, etc.)
 * via HTTP POST to OTEL_EXPORTER_OTLP_ENDPOINT.
 *
 * Uses the OTLP JSON format (application/json) — no OTel SDK dependency required.
 * Silently no-ops when the endpoint env var is not set.
 *
 * Environment variables:
 *   OTEL_EXPORTER_OTLP_ENDPOINT  — base URL, e.g. https://tempo.example.com
 *   OTEL_EXPORTER_OTLP_HEADERS   — optional comma-separated "key=value" auth headers
 */
export class OtlpExporter implements BaseExporter {
  readonly name = "otlp";

  private readonly endpoint: string | undefined;
  private readonly headers: Record<string, string>;

  constructor() {
    this.endpoint = process.env.OTEL_EXPORTER_OTLP_ENDPOINT;
    this.headers = parseHeadersEnv(process.env.OTEL_EXPORTER_OTLP_HEADERS);
  }

  export(event: ObservabilityEvent): void {
    if (!this.endpoint) return;

    const body = buildOtlpPayload(event);
    const url = `${this.endpoint.replace(/\/$/, "")}/v1/traces`;

    // Fire-and-forget — never block the request path
    fetch(url, {
      method: "POST",
      headers: { "Content-Type": "application/json", ...this.headers },
      body: JSON.stringify(body),
    }).catch(() => {
      // swallow — exporter errors must never propagate
    });
  }
}

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

function buildOtlpPayload(event: ObservabilityEvent) {
  const traceId = randomHex(32);
  const spanId = randomHex(16);
  const nowNs = BigInt(event.timestamp) * BigInt(1_000_000);
  const endNs = nowNs + BigInt((event.duration ?? 0) * 1_000_000);

  return {
    resourceSpans: [
      {
        resource: {
          attributes: otlpAttrs({
            "service.name": event.platform,
            "service.version": event.appVersion,
          }),
        },
        scopeSpans: [
          {
            scope: { name: "mp-observability", version: "1.0.0" },
            spans: [
              {
                traceId,
                spanId,
                name: event.eventName,
                kind: 1, // SPAN_KIND_INTERNAL
                startTimeUnixNano: nowNs.toString(),
                endTimeUnixNano: endNs.toString(),
                attributes: otlpAttrs({
                  "event.category": event.category,
                  "session.id": event.sessionId,
                  ...(event.userId ? { "user.id": event.userId } : {}),
                  ...(event.severity ? { "event.severity": event.severity } : {}),
                  ...flattenProperties(event.properties),
                }),
                status: {
                  code: event.severity === "error" || event.severity === "critical" ? 2 : 1,
                },
              },
            ],
          },
        ],
      },
    ],
  };
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

function randomHex(length: number): string {
  const bytes = new Uint8Array(length / 2);
  if (typeof crypto !== "undefined" && crypto.getRandomValues) {
    crypto.getRandomValues(bytes);
  } else {
    // Node.js fallback
    for (let i = 0; i < bytes.length; i++) bytes[i] = Math.floor(Math.random() * 256);
  }
  return Array.from(bytes)
    .map((b) => b.toString(16).padStart(2, "0"))
    .join("");
}
