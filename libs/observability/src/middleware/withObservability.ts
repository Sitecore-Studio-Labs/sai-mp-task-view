import { NextRequest, NextResponse } from "next/server";

import { ObservabilityClient } from "../core/client";
import { createLogger } from "../core/logger";
import { METRIC } from "../types/metrics";

type RouteHandler = (
  req: NextRequest,
  ctx: { params: Promise<Record<string, string>> },
) => Promise<NextResponse> | NextResponse;

const SLOW_THRESHOLD_MS = 3000;

/**
 * Higher-order function that wraps a Next.js App Router API route handler with:
 *   - Request timing + `api.request` event
 *   - `api.error` event on 4xx / 5xx responses
 *   - `api.slow` event when duration exceeds SLOW_THRESHOLD_MS
 *   - `X-Request-Id` response header for log correlation
 *   - Structured request/response logging via Pino
 *
 * Usage:
 *   export const GET = withObservability("jira.issues.list", async (req) => { ... });
 *
 * @param operationName  Dot-namespaced label used in the event's properties.endpoint field
 * @param handler        The original route handler
 * @param platform       Optional platform override (defaults to the client's configured platform)
 */
export function withObservability(
  operationName: string,
  handler: RouteHandler,
  platform?: string,
): RouteHandler {
  return async (req, ctx) => {
    const requestId = crypto.randomUUID();
    const start = Date.now();

    const logger = createLogger({
      platform: platform ?? "platform",
      requestId,
      operation: operationName,
      method: req.method,
    });

    logger.info(`→ ${req.method} ${operationName}`);

    const client = ObservabilityClient.getInstance();
    let response: NextResponse;
    let statusCode = 500;

    try {
      response = await handler(req, ctx);
      statusCode = response.status;
    } catch (err) {
      const error = err instanceof Error ? err : new Error(String(err));
      const duration = Date.now() - start;

      logger.error(`✗ ${operationName} threw`, { duration }, error);

      client.trackError(METRIC.API_ERROR, error, {
        errorCode: "UNHANDLED_EXCEPTION",
        properties: {
          endpoint: operationName,
          method: req.method,
          durationMs: duration,
        },
      });

      return addRequestId(
        NextResponse.json({ error: "Internal Server Error" }, { status: 500 }),
        requestId,
      );
    }

    const duration = Date.now() - start;

    logger.info(`← ${req.method} ${operationName} ${statusCode}`, { duration, statusCode });

    // ── Emit api.request event ──────────────────────────────────────────────
    client.track({
      eventName: METRIC.API_REQUEST,
      category: "api",
      duration,
      properties: {
        endpoint: operationName,
        method: req.method,
        statusCode,
      },
    });

    // ── Emit api.error event for 4xx / 5xx ──────────────────────────────────
    if (statusCode >= 400) {
      client.track({
        eventName: METRIC.API_ERROR,
        category: "error",
        severity: statusCode >= 500 ? "error" : "warn",
        duration,
        properties: {
          endpoint: operationName,
          method: req.method,
          statusCode,
        },
      });
    }

    // ── Emit api.slow event when threshold exceeded ─────────────────────────
    if (duration > SLOW_THRESHOLD_MS) {
      client.track({
        eventName: METRIC.API_SLOW,
        category: "performance",
        severity: "warn",
        duration,
        properties: {
          endpoint: operationName,
          method: req.method,
          statusCode,
          threshold: SLOW_THRESHOLD_MS,
        },
      });
    }

    return addRequestId(response, requestId);
  };
}

function addRequestId(response: NextResponse, requestId: string): NextResponse {
  response.headers.set("X-Request-Id", requestId);
  return response;
}
