import { NextRequest, NextResponse } from "next/server";

import { env } from "@/lib/config";
import { createSupabaseServerClient } from "@/lib/supabaseClient";
import { verifyWrikeWebhookSecret } from "@/lib/webhookSignature";

/**
 * Wrike webhook handler.
 *
 * GET  — Wrike calls this to verify the endpoint before delivering events.
 *        When WRIKE_WEBHOOK_SECRET is set, the ?secretToken= query param is validated.
 *        Responds 200 so Wrike marks the webhook as active.
 *
 * POST — Receives Wrike task events as a JSON array:
 *        [{ taskId: string, eventType: string, webhookId: string }, ...]
 *        Inserts a row into wrike_webhook_events so Supabase Realtime triggers a UI refresh.
 *        Always returns 200 — Wrike retries on non-2xx, so we never surface DB errors to it.
 */
export async function GET(request: NextRequest) {
  console.log("WRIKE_WEBHOOK_SECRET", env.WRIKE_WEBHOOK_SECRET);
  if (env.WRIKE_WEBHOOK_SECRET) {
    const suppliedToken = request.nextUrl.searchParams.get("secretToken");
    if (!verifyWrikeWebhookSecret(suppliedToken, env.WRIKE_WEBHOOK_SECRET)) {
      console.warn("[webhooks/wrike] GET challenge failed — invalid secretToken.");
      return new NextResponse(null, { status: 403 });
    }
  }

  if (process.env.NODE_ENV === "development") {
    console.log("[webhooks/wrike] GET challenge accepted.");
  }

  return new NextResponse(null, { status: 200 });
}

export async function POST(request: NextRequest) {
  const rawBody = await request.text();

  let events: unknown;
  try {
    events = JSON.parse(rawBody);
  } catch {
    if (process.env.NODE_ENV === "development") {
      console.log("[webhooks/wrike] POST body missing or invalid JSON");
    }
    return NextResponse.json({ ok: true }, { status: 200 });
  }

  if (!Array.isArray(events) || events.length === 0) {
    return NextResponse.json({ ok: true }, { status: 200 });
  }

  const supabase = createSupabaseServerClient();

  for (const event of events) {
    if (event == null || typeof event !== "object") continue;

    const e = event as Record<string, unknown>;
    const taskId = typeof e.taskId === "string" ? e.taskId : null;
    const eventType = typeof e.eventType === "string" ? e.eventType : "unknown";

    if (!taskId) continue;

    const { error } = await supabase.from("wrike_webhook_events").insert({
      task_id: taskId,
      event_type: eventType,
      occurred_at: new Date().toISOString(),
    });

    if (error) {
      console.error("[webhooks/wrike] Supabase insert failed:", error.message, {
        taskId,
        eventType,
      });
    } else if (process.env.NODE_ENV === "development") {
      console.log("[webhooks/wrike] Stored event:", eventType, taskId);
    }
  }

  return NextResponse.json({ ok: true }, { status: 200 });
}
