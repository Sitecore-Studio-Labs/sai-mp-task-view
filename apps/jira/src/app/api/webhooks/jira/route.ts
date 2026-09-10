import { query } from "@mp/db";
import { NextRequest, NextResponse } from "next/server";

import { env } from "@/lib/config";
import { verifyJiraWebhookSignature } from "@/lib/webhookSignature";

/**
 * Jira Cloud webhook handler (admin webhooks or REST-registered).
 * Events: jira:issue_created, jira:issue_updated, jira:issue_deleted.
 * Responds quickly; only persists event for UI invalidation via
 * /api/jira/sync-signal.
 * No heavy refetch or Jira API calls here (serverless-safe).
 *
 * When JIRA_WEBHOOK_SECRET is configured, the X-Hub-Signature header is verified
 * before the body is parsed. Requests that fail verification are rejected with 401.
 */
export async function POST(request: NextRequest) {
  // Read raw body first — required for HMAC verification before JSON parsing.
  const rawBody = await request.text();

  if (env.JIRA_WEBHOOK_SECRET) {
    const signature = request.headers.get("x-hub-signature");
    if (!verifyJiraWebhookSignature(rawBody, signature, env.JIRA_WEBHOOK_SECRET)) {
      console.warn("[webhooks/jira] Signature verification failed — request rejected.");
      return NextResponse.json({ error: "Invalid webhook signature." }, { status: 401 });
    }
  }

  try {
    let body: unknown;
    try {
      body = JSON.parse(rawBody);
    } catch {
      if (process.env.NODE_ENV === "development") {
        console.log("[webhooks/jira] POST body missing or invalid JSON");
      }
      return NextResponse.json({ ok: true }, { status: 200 });
    }

    if (body == null || typeof body !== "object") {
      return NextResponse.json({ ok: true }, { status: 200 });
    }

    const b = body as Record<string, unknown>;
    const webhookEvent = typeof b.webhookEvent === "string" ? b.webhookEvent : "";
    const issue = b.issue != null && typeof b.issue === "object" ? b.issue : null;
    const issueKey =
      issue != null && typeof (issue as Record<string, unknown>).key === "string"
        ? ((issue as Record<string, unknown>).key as string)
        : null;
    const projectObj = (issue as { fields?: { project?: unknown } } | null)?.fields?.project;
    const projectKey =
      projectObj != null &&
      typeof projectObj === "object" &&
      typeof (projectObj as Record<string, unknown>).key === "string"
        ? ((projectObj as Record<string, unknown>).key as string)
        : null;

    if (!issueKey || !projectKey) {
      if (process.env.NODE_ENV === "development") {
        console.log(
          "[webhooks/jira] Skipped: webhookEvent=%s issueKey=%s projectKey=%s",
          webhookEvent || "(none)",
          issueKey ?? "(none)",
          projectKey ?? "(none)",
        );
      }
      return NextResponse.json({ ok: true }, { status: 200 });
    }

    const eventType =
      webhookEvent === "jira:issue_created"
        ? "issue_created"
        : webhookEvent === "jira:issue_updated"
          ? "issue_updated"
          : webhookEvent === "jira:issue_deleted"
            ? "issue_deleted"
            : webhookEvent || "unknown";

    try {
      await query(
        `insert into jira_webhook_events (issue_key, project_key, event_type)
         values ($1, $2, $3)`,
        [issueKey, projectKey, eventType],
      );
    } catch (err) {
      const message = err instanceof Error ? err.message : "unknown error";
      console.error("[webhooks/jira] Insert failed:", message, {
        issueKey,
        projectKey,
        eventType,
      });
      return NextResponse.json({ ok: true }, { status: 200 });
    }
    if (process.env.NODE_ENV === "development") {
      console.log("[webhooks/jira] Stored event:", eventType, issueKey, projectKey);
    }

    return NextResponse.json({ ok: true }, { status: 200 });
  } catch (err) {
    console.error("[webhooks/jira] Error:", err);
    return NextResponse.json({ ok: true }, { status: 200 });
  }
}
