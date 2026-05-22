import { createLogger, METRIC, ObservabilityClient, ThresholdMonitor } from "@mp/observability";
import { PlatformApiError } from "@mp/task-core";
import { NextRequest, NextResponse } from "next/server";

import { JiraAuthError } from "@/exceptions/jiraErrors";
import { clearJiraCookie } from "@/helpers/cookies";
import { getJiraUserIdFromSession } from "@/helpers/jiraUserId";
import { JiraServiceAdapter } from "@/platforms/JiraServiceAdapter";

const SLOW_THRESHOLD_MS = 3000;
const PLATFORM = "jira";

function deriveOperationName(request: NextRequest): string {
  return request.nextUrl.pathname
    .replace(/^\/api\//, "")
    .replace(/\[.*?\]/g, "param")
    .replace(/\//g, ".");
}

function trackResponse(
  operationName: string,
  method: string,
  statusCode: number,
  duration: number,
): void {
  const client = ObservabilityClient.getInstance();
  const monitor = ThresholdMonitor.getInstance();

  client.track({
    eventName: METRIC.API_REQUEST,
    category: "api",
    duration,
    properties: { endpoint: operationName, method, statusCode },
  });
  monitor.record(METRIC.API_REQUEST);

  if (statusCode >= 400) {
    client.track({
      eventName: METRIC.API_ERROR,
      category: "error",
      severity: statusCode >= 500 ? "error" : "warn",
      duration,
      properties: { endpoint: operationName, method, statusCode },
    });
    monitor.record(METRIC.API_ERROR);
  }
  if (duration > SLOW_THRESHOLD_MS) {
    client.track({
      eventName: METRIC.API_SLOW,
      category: "performance",
      severity: "warn",
      duration,
      properties: { endpoint: operationName, method, statusCode, threshold: SLOW_THRESHOLD_MS },
    });
    monitor.record(METRIC.API_SLOW);
  }
}

function addRequestId(response: NextResponse, requestId: string): NextResponse {
  response.headers.set("X-Request-Id", requestId);
  return response;
}

/**
 * Single source of truth for all platform error responses.
 *
 * Decision table:
 *  JiraAuthError                          → clear cookie + 401 (session expired / token revoked)
 *  PlatformApiError with 4xx statusCode   → pass through the platform status code (caller error)
 *  PlatformApiError with 5xx statusCode   → 502 Bad Gateway (upstream failure)
 *  "No active Jira connection…" msg       → clear cookie + 401
 *  Anything else                          → log + 500
 */
async function handlePlatformError(error: unknown, path: string): Promise<NextResponse> {
  if (error instanceof JiraAuthError) {
    await clearJiraCookie();
    return NextResponse.json({ error: error.message }, { status: 401 });
  }

  if (error instanceof PlatformApiError) {
    const isClientError = error.statusCode >= 400 && error.statusCode < 500;
    return NextResponse.json(
      { error: error.message },
      { status: isClientError ? error.statusCode : 502 },
    );
  }

  if (error instanceof Error && error.message === "No active Jira connection found for user.") {
    await clearJiraCookie();
    return NextResponse.json({ error: "No active Jira connection." }, { status: 401 });
  }

  if (error instanceof Error && error.message.includes("not implemented")) {
    return NextResponse.json({ error: "Not implemented." }, { status: 501 });
  }

  console.error(`[platformRoute] Unhandled error at ${path}:`, error);
  return NextResponse.json({ error: "Internal server error." }, { status: 500 });
}

export interface WithAdapterOptions {
  /**
   * When true and the user has no active session, return an empty JSON array
   * instead of 401. Used by the projects endpoint which the UI polls to detect
   * connection state — a 401 there would incorrectly trigger auth-failure dialogs
   * before the user has connected. Also silences "no site selected" errors so the
   * UI gracefully shows an empty project list during setup.
   */
  emptyOnNoAuth?: boolean;
}

/**
 * Wraps a route handler with Jira auth + centralised error handling.
 * The handler's return value is automatically JSON-serialised.
 * Void-returning handlers (e.g. delete, upload) should explicitly return
 * a value such as `{ success: true }` or `null`.
 *
 * Pass `{ emptyOnNoAuth: true }` for polling endpoints that must return []
 * rather than 401 when no session exists.
 */
export async function withAdapter<T>(
  request: NextRequest,
  handler: (adapter: JiraServiceAdapter) => Promise<T>,
  options?: WithAdapterOptions,
): Promise<NextResponse> {
  const requestId = crypto.randomUUID();
  const start = Date.now();
  const operationName = deriveOperationName(request);
  const logger = createLogger({
    platform: PLATFORM,
    requestId,
    operation: operationName,
    method: request.method,
  });

  logger.info(`→ ${request.method} ${operationName}`);

  const userId = await getJiraUserIdFromSession(request);

  if (!userId) {
    const response = options?.emptyOnNoAuth
      ? NextResponse.json([])
      : NextResponse.json({ error: "No active Jira connection." }, { status: 401 });
    const duration = Date.now() - start;
    logger.info(`← ${request.method} ${operationName} ${response.status}`, {
      duration,
      statusCode: response.status,
    });
    trackResponse(operationName, request.method, response.status, duration);
    return addRequestId(response, requestId);
  }

  let response: NextResponse;
  try {
    response = NextResponse.json(await handler(new JiraServiceAdapter(userId)));
  } catch (error) {
    const duration = Date.now() - start;
    if (options?.emptyOnNoAuth) {
      if (error instanceof JiraAuthError) {
        await clearJiraCookie();
        const r = NextResponse.json({ error: (error as JiraAuthError).message }, { status: 401 });
        logger.warn(`← ${request.method} ${operationName} 401`, { duration });
        trackResponse(operationName, request.method, 401, duration);
        return addRequestId(r, requestId);
      }
      const message = error instanceof Error ? error.message : "";
      if (message === "No active Jira connection found for user.") {
        await clearJiraCookie();
        trackResponse(operationName, request.method, 200, duration);
        return addRequestId(NextResponse.json([]), requestId);
      }
      if (message === "No Jira site selected. Please reconnect to Jira and select a site.") {
        trackResponse(operationName, request.method, 200, duration);
        return addRequestId(NextResponse.json([]), requestId);
      }
    }
    logger.error(
      `✗ ${operationName} threw`,
      { duration },
      error instanceof Error ? error : undefined,
    );
    const errResponse = await handlePlatformError(error, request.nextUrl.pathname);
    trackResponse(operationName, request.method, errResponse.status, duration);
    return addRequestId(errResponse, requestId);
  }

  const duration = Date.now() - start;
  logger.info(`← ${request.method} ${operationName} ${response.status}`, {
    duration,
    statusCode: response.status,
  });
  trackResponse(operationName, request.method, response.status, duration);
  return addRequestId(response, requestId);
}

/**
 * Variant for handlers that must construct their own NextResponse
 * (e.g. binary file downloads, 204 No Content, streaming).
 */
export async function withAdapterRaw(
  request: NextRequest,
  handler: (adapter: JiraServiceAdapter) => Promise<NextResponse>,
): Promise<NextResponse> {
  const requestId = crypto.randomUUID();
  const start = Date.now();
  const operationName = deriveOperationName(request);
  const logger = createLogger({
    platform: PLATFORM,
    requestId,
    operation: operationName,
    method: request.method,
  });

  logger.info(`→ ${request.method} ${operationName}`);

  const userId = await getJiraUserIdFromSession(request);
  if (!userId) {
    const duration = Date.now() - start;
    logger.warn(`← ${request.method} ${operationName} 401 (no session)`, { duration });
    trackResponse(operationName, request.method, 401, duration);
    return addRequestId(
      NextResponse.json({ error: "No active Jira connection." }, { status: 401 }),
      requestId,
    );
  }

  let response: NextResponse;
  try {
    response = await handler(new JiraServiceAdapter(userId));
  } catch (error) {
    const duration = Date.now() - start;
    logger.error(
      `✗ ${operationName} threw`,
      { duration },
      error instanceof Error ? error : undefined,
    );
    const errResponse = await handlePlatformError(error, request.nextUrl.pathname);
    trackResponse(operationName, request.method, errResponse.status, duration);
    return addRequestId(errResponse, requestId);
  }

  const duration = Date.now() - start;
  logger.info(`← ${request.method} ${operationName} ${response.status}`, {
    duration,
    statusCode: response.status,
  });
  trackResponse(operationName, request.method, response.status, duration);
  return addRequestId(response, requestId);
}
