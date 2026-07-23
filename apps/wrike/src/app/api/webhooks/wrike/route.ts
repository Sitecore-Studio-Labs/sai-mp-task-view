import { NextRequest, NextResponse } from "next/server";

import { env } from "@/lib/config";
import { createSupabaseServerClient } from "@/lib/supabaseClient";
import {
  hmacSha256Hex,
  isSafeWrikeHookSecret,
  verifyWrikeWebhookSignature,
} from "@/lib/webhookSignature";

type WrikeWebhookEvent = {
  eventType?: unknown;
  taskId?: unknown;
  lastUpdatedDate?: unknown;
};

/**
 * Wrike webhook handler.
 * Events arrive as a JSON array (even for a single notification).
 * Folder-scoped hooks encode `projectKey` (folder id) on the callback URL query string
 * because payloads do not include the parent folder id.
 *
 * When WRIKE_WEBHOOK_SECRET is set:
 * - Handshake: respond to X-Hook-Secret challenge during registration
 * - Events: verify X-Hook-Signature before processing
 *
 * @see https://developers.wrike.com/docs/webhooks
 */
export async function POST(request: NextRequest) {
  const rawBody = await request.text();
  const secret = env.WRIKE_WEBHOOK_SECRET;
  const hookSecretHeader = request.headers.get("x-hook-secret");
  const signature = request.headers.get("x-hook-signature");

  // Secure webhook handshake (registration-time challenge from Wrike).
  if (secret && hookSecretHeader) {
    if (!isSafeWrikeHookSecret(hookSecretHeader)) {
      console.warn("[webhooks/wrike] Rejected unsafe X-Hook-Secret challenge.");
      return NextResponse.json({ error: "Invalid hook secret challenge." }, { status: 400 });
    }
    if (!verifyWrikeWebhookSignature(rawBody, signature, secret)) {
      console.warn("[webhooks/wrike] Handshake signature verification failed.");
      return NextResponse.json({ error: "Invalid webhook signature." }, { status: 401 });
    }
    const responseSecret = hmacSha256Hex(secret, hookSecretHeader);
    return new NextResponse(null, {
      status: 200,
      headers: { "X-Hook-Secret": responseSecret },
    });
  }

  if (secret) {
    if (!verifyWrikeWebhookSignature(rawBody, signature, secret)) {
      console.warn("[webhooks/wrike] Signature verification failed — request rejected.");
      return NextResponse.json({ error: "Invalid webhook signature." }, { status: 401 });
    }
  }

  // Accessibility probe (empty body) during hookUrl validation.
  if (!rawBody.trim()) {
    return new NextResponse(null, { status: 200 });
  }

  try {
    let body: unknown;
    try {
      body = JSON.parse(rawBody);
    } catch {
      if (process.env.NODE_ENV === "development") {
        console.log("[webhooks/wrike] POST body missing or invalid JSON");
      }
      return NextResponse.json({ ok: true }, { status: 200 });
    }

    const events: WrikeWebhookEvent[] = Array.isArray(body)
      ? (body as WrikeWebhookEvent[])
      : body != null && typeof body === "object"
        ? [body as WrikeWebhookEvent]
        : [];

    const projectKey = request.nextUrl.searchParams.get("projectKey")?.trim() || null;
    if (!projectKey) {
      if (process.env.NODE_ENV === "development") {
        console.log("[webhooks/wrike] Skipped: missing projectKey query param");
      }
      return NextResponse.json({ ok: true }, { status: 200 });
    }

    const supabase = createSupabaseServerClient();
    for (const event of events) {
      const eventType = typeof event.eventType === "string" ? event.eventType : "";
      const taskId = typeof event.taskId === "string" ? event.taskId : null;
      if (!taskId) continue;

      // Ignore non-task noise (folder/space events) for the task list UI.
      if (eventType && !eventType.startsWith("Task") && !eventType.startsWith("Comment")) {
        continue;
      }

      const occurredAt =
        typeof event.lastUpdatedDate === "string" && event.lastUpdatedDate
          ? event.lastUpdatedDate
          : new Date().toISOString();

      const { error } = await supabase.from("wrike_webhook_events").insert({
        issue_key: taskId,
        project_key: projectKey,
        event_type: eventType || "unknown",
        occurred_at: occurredAt,
      });

      if (error) {
        console.error("[webhooks/wrike] Supabase insert failed:", error.message, {
          taskId,
          projectKey,
          eventType,
        });
        continue;
      }
      if (process.env.NODE_ENV === "development") {
        console.log("[webhooks/wrike] Stored event:", eventType || "unknown", taskId, projectKey);
      }
    }

    return NextResponse.json({ ok: true }, { status: 200 });
  } catch (err) {
    console.error("[webhooks/wrike] Error:", err);
    return NextResponse.json({ ok: true }, { status: 200 });
  }
}
