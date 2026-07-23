import { NextRequest, NextResponse } from "next/server";

import { WrikeAuthError } from "@/exceptions/wrikeErrors";
import { clearWrikeCookie } from "@/helpers/cookies";
import { getWrikeUserIdFromSession } from "@/helpers/wrikeUserId";
import { env } from "@/lib/config";
import { registerWrikeFolderWebhook } from "@/services/wrikeService";

/** Default task-lifecycle events that should refresh the Context Panel. */
const DEFAULT_WRIKE_WEBHOOK_EVENTS = [
  "TaskCreated",
  "TaskDeleted",
  "TaskTitleChanged",
  "TaskDescriptionChanged",
  "TaskStatusChanged",
  "TaskImportanceChanged",
  "TaskDatesChanged",
  "TaskResponsiblesAdded",
  "TaskResponsiblesRemoved",
  "TaskParentsAdded",
  "TaskParentsRemoved",
];

/**
 * Build the public base URL for this app (used as webhook callback origin).
 */
function getAppBaseUrl(): string {
  const url =
    process.env.NEXT_PUBLIC_APP_URL ||
    process.env.VERCEL_URL ||
    process.env.VERCEL_PROJECT_PRODUCTION_URL;
  if (url) {
    return url.startsWith("http") ? url : `https://${url}`;
  }
  return "https://your-app.example.com";
}

/**
 * POST /api/wrike/webhooks
 * Register a recursive folder webhook with Wrike for the selected project/folder.
 *
 * Body:
 *   - folderId / projectKey?: string — Wrike folder id (required)
 *   - url?: string — Full callback URL (default: {baseUrl}/api/webhooks/wrike?projectKey=…)
 *   - events?: string[] — Event types (default: task lifecycle set above)
 *   - recursive?: boolean — Include subfolders (default: true)
 *
 * Response: { webhookId: string, hookUrl: string, reused?: boolean }
 */
export async function POST(request: NextRequest) {
  const userId = await getWrikeUserIdFromSession(request);
  if (!userId) {
    return NextResponse.json({ error: "No active Wrike connection." }, { status: 404 });
  }

  try {
    let body: {
      folderId?: string;
      projectKey?: string;
      url?: string;
      events?: string[];
      recursive?: boolean;
    } = {};
    try {
      body = (await request.json()) as typeof body;
    } catch {
      // empty body is ok when folderId comes from elsewhere — still validate below
    }

    const folderId =
      (typeof body.folderId === "string" && body.folderId.trim()) ||
      (typeof body.projectKey === "string" && body.projectKey.trim()) ||
      "";

    if (!folderId) {
      return NextResponse.json(
        { error: "folderId (or projectKey) is required to register a folder webhook." },
        { status: 400 },
      );
    }

    const baseUrl = getAppBaseUrl();
    const defaultCallback = `${baseUrl}/api/webhooks/wrike?projectKey=${encodeURIComponent(folderId)}`;
    const callbackUrl =
      typeof body.url === "string" && body.url.trim() ? body.url.trim() : defaultCallback;

    const events =
      Array.isArray(body.events) && body.events.length > 0
        ? body.events
        : DEFAULT_WRIKE_WEBHOOK_EVENTS;

    const recursive = body.recursive !== false;

    const result = await registerWrikeFolderWebhook(userId, folderId, callbackUrl, {
      events,
      recursive,
      secret: env.WRIKE_WEBHOOK_SECRET,
    });

    return NextResponse.json(result);
  } catch (error: unknown) {
    if (error instanceof WrikeAuthError) {
      await clearWrikeCookie();
      return NextResponse.json({ error: error.message }, { status: 401 });
    }
    const message = error instanceof Error ? error.message : "";
    if (message === "No active Wrike connection found for user.") {
      await clearWrikeCookie();
      return NextResponse.json(
        { error: "Wrike is not connected. Connect Wrike first." },
        { status: 401 },
      );
    }
    const status =
      (error as { statusCode?: number; response?: { status?: number } })?.statusCode ??
      (error as { response?: { status?: number } })?.response?.status;
    if (status === 401 || status === 403) {
      return NextResponse.json(
        {
          error:
            "Wrike rejected the request (401/403). Ensure your OAuth app can manage webhooks, then disconnect and reconnect Wrike.",
        },
        { status: 502 },
      );
    }
    console.error("Failed to register Wrike webhooks:", error);
    return NextResponse.json({ error: "Failed to register webhooks." }, { status: 500 });
  }
}
