import type { Span, Tracer } from "./client";

/**
 * Returns a Tracer backed by the OpenTelemetry global API if available,
 * otherwise falls back to the NO_OP_TRACER already defined on the client.
 *
 * Usage in non-React contexts (server-side, utilities):
 *   const tracer = getOtelTracer("jira.issues");
 *   const span = tracer.startSpan("fetch-issues");
 *   try { ... } finally { span.end(); }
 *
 * The OTel API package is an optional peer dependency — the app works fine
 * without it; spans simply become no-ops until @opentelemetry/api is installed.
 */
export function getOtelTracer(name: string): Tracer {
  try {
    // eslint-disable-next-line @typescript-eslint/no-require-imports
    const api = require("@opentelemetry/api") as {
      trace: {
        getTracer(name: string): {
          startSpan(name: string): {
            setAttribute(key: string, value: string | number | boolean): void;
            setStatus(status: { code: number; message?: string }): void;
            end(): void;
          };
        };
      };
      SpanStatusCode: { OK: number; ERROR: number };
    };

    const otelTracer = api.trace.getTracer(name);
    return {
      startSpan(spanName: string): Span {
        const otelSpan = otelTracer.startSpan(spanName);
        return {
          setAttribute: (k, v) => {
            otelSpan.setAttribute(k, v);
          },
          setStatus: (code, message) => {
            const otelCode = code === "ok" ? api.SpanStatusCode.OK : api.SpanStatusCode.ERROR;
            otelSpan.setStatus({ code: otelCode, message });
          },
          end: () => otelSpan.end(),
        };
      },
    };
  } catch {
    return NO_OP_TRACER;
  }
}

const NO_OP_SPAN: Span = {
  setAttribute: () => {},
  setStatus: () => {},
  end: () => {},
};

const NO_OP_TRACER: Tracer = {
  startSpan: () => NO_OP_SPAN,
};
