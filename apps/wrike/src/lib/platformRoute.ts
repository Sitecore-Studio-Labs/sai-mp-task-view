import { PlatformApiError } from "@mp/task-core";
import axios from "axios";
import { NextRequest, NextResponse } from "next/server";

import { WrikeAuthError } from "@/exceptions/wrikeErrors";
import { clearWrikeCookie } from "@/helpers/cookies";
import { getWrikeUserIdFromSession } from "@/helpers/wrikeUserId";
import { getSiteOverrideFromRequest, runWithSiteOverride } from "@/lib/siteOverrideContext";
import { isPlaceholderWrikeSite, WRIKE_MISSING_HOST_MESSAGE } from "@/lib/wrikeHost";
import { WrikeServiceAdapter } from "@/platforms/WrikeServiceAdapter";

/**
 * Single source of truth for all platform error responses.
 *
 * Decision table:
 *  WrikeAuthError                          → clear cookie + 401 (session expired / token revoked)
 *  PlatformApiError with 4xx statusCode   → pass through the platform status code (caller error)
 *  PlatformApiError with 5xx statusCode   → 502 Bad Gateway (upstream failure)
 *  "No active Wrike connection…" msg → clear cookie + 401
 *  Missing data-centre host               → clear cookie + 401 with needsReconnect flag
 *  Anything else                          → log + 500
 */
async function handlePlatformError(error: unknown, path: string): Promise<NextResponse> {
  if (error instanceof WrikeAuthError) {
    await clearWrikeCookie();
    return NextResponse.json({ error: (error as Error).message }, { status: 401 });
  }

  if (error instanceof PlatformApiError) {
    const isClientError = error.statusCode >= 400 && error.statusCode < 500;
    return NextResponse.json(
      { error: error.message },
      { status: isClientError ? error.statusCode : 502 },
    );
  }

  if (error instanceof Error && error.message === "No active Wrike connection found for user.") {
    await clearWrikeCookie();
    return NextResponse.json({ error: "No active Wrike connection." }, { status: 401 });
  }

  if (error instanceof Error && error.message === WRIKE_MISSING_HOST_MESSAGE) {
    await clearWrikeCookie();
    return NextResponse.json({ error: error.message, needsReconnect: true }, { status: 401 });
  }

  if (axios.isAxiosError(error)) {
    const baseUrl = String(error.config?.baseURL ?? "");
    if (isPlaceholderWrikeSite(baseUrl.replace(/\/api\/v\d+\/?$/i, ""))) {
      await clearWrikeCookie();
      return NextResponse.json(
        { error: WRIKE_MISSING_HOST_MESSAGE, needsReconnect: true },
        { status: 401 },
      );
    }
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
 * Wraps a route handler with Wrike auth + centralised error handling.
 * The handler's return value is automatically JSON-serialised.
 * Void-returning handlers (e.g. delete, upload) should explicitly return
 * a value such as `{ success: true }` or `null`.
 *
 * Pass `{ emptyOnNoAuth: true }` for polling endpoints that must return []
 * rather than 401 when no session exists.
 */
export async function withAdapter<T>(
  request: NextRequest,
  handler: (adapter: WrikeServiceAdapter) => Promise<T>,
  options?: WithAdapterOptions,
): Promise<NextResponse> {
  const userId = await getWrikeUserIdFromSession(request);

  if (!userId) {
    if (options?.emptyOnNoAuth) return NextResponse.json([]);
    return NextResponse.json({ error: "No active Wrike connection." }, { status: 401 });
  }

  const siteOverride = getSiteOverrideFromRequest(request);

  try {
    return NextResponse.json(
      await runWithSiteOverride(siteOverride, () => handler(new WrikeServiceAdapter(userId))),
    );
  } catch (error) {
    if (options?.emptyOnNoAuth) {
      if (error instanceof WrikeAuthError) {
        await clearWrikeCookie();
        return NextResponse.json({ error: (error as Error).message }, { status: 401 });
      }
      const message = error instanceof Error ? error.message : "";
      if (message === "No active Wrike connection found for user.") {
        await clearWrikeCookie();
        return NextResponse.json([]);
      }
      if (message === "No Wrike site selected. Please reconnect to Wrike and select a site.") {
        return NextResponse.json([]);
      }
      if (message === WRIKE_MISSING_HOST_MESSAGE) {
        await clearWrikeCookie();
        return NextResponse.json([]);
      }
      if (axios.isAxiosError(error)) {
        const baseUrl = String(error.config?.baseURL ?? "");
        if (isPlaceholderWrikeSite(baseUrl.replace(/\/api\/v\d+\/?$/i, ""))) {
          await clearWrikeCookie();
          return NextResponse.json([]);
        }
      }
    }
    return handlePlatformError(error, request.nextUrl.pathname);
  }
}

/**
 * Variant for handlers that must construct their own NextResponse
 * (e.g. binary file downloads, 204 No Content, streaming).
 */
export async function withAdapterRaw(
  request: NextRequest,
  handler: (adapter: WrikeServiceAdapter) => Promise<NextResponse>,
): Promise<NextResponse> {
  const userId = await getWrikeUserIdFromSession(request);
  if (!userId) {
    return NextResponse.json({ error: "No active Wrike connection." }, { status: 401 });
  }

  const siteOverride = getSiteOverrideFromRequest(request);

  try {
    return await runWithSiteOverride(siteOverride, () => handler(new WrikeServiceAdapter(userId)));
  } catch (error) {
    return handlePlatformError(error, request.nextUrl.pathname);
  }
}
