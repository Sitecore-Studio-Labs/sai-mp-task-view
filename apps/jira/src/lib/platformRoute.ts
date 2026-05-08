import { NextRequest, NextResponse } from "next/server";

import { JiraAuthError } from "@/exceptions/jiraErrors";
import { clearJiraCookie } from "@/helpers/cookies";
import { getJiraUserIdFromSession } from "@/helpers/jiraUserId";
import { JiraClientError } from "@/platforms/jira/JiraAdapter";
import { JiraServiceAdapter } from "@/platforms/JiraServiceAdapter";

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

  if (error instanceof Error && error.message.includes("not implemented")) {
    return NextResponse.json({ error: "Not implemented." }, { status: 501 });
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
 * Projects-endpoint variant: returns [] instead of 401 when the user has no
 * active connection. The UI polls /projects to detect connection state, so a
 * 401 would incorrectly trigger auth-failure dialogs before the user connects.
 */
export async function withAdapterOrEmpty<T>(
  request: NextRequest,
  handler: (adapter: JiraServiceAdapter) => Promise<T>,
): Promise<NextResponse> {
  const userId = await getJiraUserIdFromSession(request);
  if (!userId) return NextResponse.json([]);

  try {
    return NextResponse.json(await handler(new JiraServiceAdapter(userId)));
  } catch (error) {
    if (error instanceof JiraAuthError) {
      await clearJiraCookie();
      return NextResponse.json({ error: (error as Error).message }, { status: 401 });
    }
    const message = error instanceof Error ? error.message : "";
    if (
      message === "No active Jira connection found for user." ||
      message === "No Jira site selected. Please reconnect to Jira and select a site."
    ) {
      await clearJiraCookie();
      return NextResponse.json([]);
    }
    if (error instanceof JiraClientError) {
      const isClientError = error.statusCode >= 400 && error.statusCode < 500;
      return NextResponse.json(
        { error: error.message },
        { status: isClientError ? error.statusCode : 502 },
      );
    }
    console.error("Failed to load Jira projects:", error);
    return NextResponse.json({ error: "Internal server error." }, { status: 500 });
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
