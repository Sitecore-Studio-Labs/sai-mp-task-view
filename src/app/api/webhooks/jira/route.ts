import { NextRequest, NextResponse } from "next/server";

import { createSupabaseServerClient } from "@/lib/supabaseClient";

/**
 * Jira Cloud webhook handler (admin webhooks or REST-registered).
 * Events: jira:issue_created, jira:issue_updated, jira:issue_deleted.
 * Responds quickly; only persists event for Realtime-driven UI invalidation.
 * No heavy refetch or Jira API calls here (serverless-safe).
 */
export async function POST(request: NextRequest) {
  try {
    const body = await request.json().catch(() => null);
    if (body == null || typeof body !== "object") {
      console.log("[webhooks/jira] POST body missing or invalid");
      return NextResponse.json({ ok: true }, { status: 200 });
    }

    const webhookEvent = typeof body.webhookEvent === "string" ? body.webhookEvent : "";
    const issue = body.issue != null && typeof body.issue === "object" ? body.issue : null;
    const issueKey = issue != null && typeof issue.key === "string" ? issue.key : null;
    const projectObj = issue?.fields?.project;
    const projectKey =
      projectObj != null && typeof projectObj === "object" && typeof projectObj.key === "string"
        ? projectObj.key
        : null;

    if (!issueKey || !projectKey) {
      console.log(
        "[webhooks/jira] Skipped: webhookEvent=%s issueKey=%s projectKey=%s",
        webhookEvent || "(none)",
        issueKey ?? "(none)",
        projectKey ?? "(none)",
      );
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

    const supabase = createSupabaseServerClient();
    const { error } = await supabase.from("jira_webhook_events").insert({
      issue_key: issueKey,
      project_key: projectKey,
      event_type: eventType,
      occurred_at: new Date().toISOString(),
    });

    if (error) {
      console.error("[webhooks/jira] Supabase insert failed:", error.message, {
        issueKey,
        projectKey,
        eventType,
      });
      return NextResponse.json({ ok: true }, { status: 200 });
    }
    console.log("[webhooks/jira] Stored event:", eventType, issueKey, projectKey);

    return NextResponse.json({ ok: true }, { status: 200 });
  } catch (err) {
    console.error("[webhooks/jira] Error:", err);
    return NextResponse.json({ ok: true }, { status: 200 });
  }
}
