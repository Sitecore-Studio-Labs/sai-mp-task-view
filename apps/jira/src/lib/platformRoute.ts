import { NextRequest, NextResponse } from "next/server";

import { JiraAuthError } from "@/exceptions/jiraErrors";
import { clearJiraCookie } from "@/helpers/cookies";
import { getJiraUserIdFromSession } from "@/helpers/jiraUserId";
import { JiraClientError } from "@/platforms/jira/JiraAdapter";
import { JiraServiceAdapter } from "@/platforms/jira/JiraServiceAdapter";

/**
 * Single source of truth for all platform error responses.
 *
 * Decision table:
 *  JiraAuthError                       → clear cookie + 401 (session expired / token revoked)
 *  JiraClientError with 4xx statusCode → pass through the Jira status code (caller error)
 *  JiraClientError with 5xx statusCode → 502 Bad Gateway (upstream failure)
 *  "No active Jira connection…" msg    → clear cookie + 401
 *  Anything else                       → log + 500
 */
async function handlePlatformError(error: unknown, path: string): Promise<NextResponse> {
  if (error instanceof JiraAuthError) {
    await clearJiraCookie();
    return NextResponse.json({ error: error.message }, { status: 401 });
  }

  if (error instanceof JiraClientError) {
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

  console.error(`[platformRoute] Unhandled error at ${path}:`, error);
  return NextResponse.json({ error: "Internal server error." }, { status: 500 });
}

/**
 * Base implementation shared by withAdapter and withAdapterRaw.
 * Resolves auth, creates the adapter, and delegates error handling.
 */
async function runWithAdapter(
  request: NextRequest,
  fn: (adapter: JiraServiceAdapter) => Promise<NextResponse>,
): Promise<NextResponse> {
  const userId = await getJiraUserIdFromSession(request);
  if (!userId) {
    return NextResponse.json({ error: "No active Jira connection." }, { status: 401 });
  }

  try {
    return await fn(new JiraServiceAdapter(userId));
  } catch (error) {
    return handlePlatformError(error, request.nextUrl.pathname);
  }
}

/**
 * Wraps a route handler with Jira auth + centralised error handling.
 * The handler's return value is automatically JSON-serialised.
 * Void-returning handlers (e.g. delete, upload) should explicitly return
 * a value such as `{ success: true }` or `null`.
 */
export async function withAdapter<T>(
  request: NextRequest,
  handler: (adapter: JiraServiceAdapter) => Promise<T>,
): Promise<NextResponse> {
  return runWithAdapter(request, async (adapter) => NextResponse.json(await handler(adapter)));
}

/**
 * Variant for handlers that must construct their own NextResponse
 * (e.g. binary file downloads, 204 No Content, streaming).
 */
export async function withAdapterRaw(
  request: NextRequest,
  handler: (adapter: JiraServiceAdapter) => Promise<NextResponse>,
): Promise<NextResponse> {
  return runWithAdapter(request, handler);
}
