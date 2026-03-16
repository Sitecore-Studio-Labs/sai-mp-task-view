import { NextRequest, NextResponse } from "next/server";

import { JiraAuthError } from "@/exceptions/jiraErrors";
import { clearJiraCookie } from "@/helpers/cookies";
import { registerJiraWebhooks } from "@/services/jiraService";

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
 * POST /api/jira/webhooks
 * Register Jira dynamic webhooks via the Jira REST API (OAuth app).
 * Requires Jira to be connected; uses the demo user's connection.
 *
 * Body:
 *   - url?: string — Full callback URL (default: {baseUrl}/api/webhooks/jira)
 *   - webhooks?: Array<{ events: string[], jqlFilter?: string }> — List of webhook configs.
 *     Default: one webhook for jira:issue_created, jira:issue_updated, jira:issue_deleted.
 *
 * Response: { results: Array<{ createdWebhookId?: number, errors?: string[] }> }
 */
export async function POST(request: NextRequest) {
  const userId = request.cookies.get("jira_user_id")?.value || "";
  try {
    let body: { url?: string; webhooks?: Array<{ events: string[]; jqlFilter?: string }> } = {};
    try {
      body = (await request.json()) as typeof body;
    } catch {
      // empty body is ok; use defaults
    }

    const baseUrl = getAppBaseUrl();
    const callbackUrl =
      typeof body.url === "string" && body.url.trim()
        ? body.url.trim()
        : `${baseUrl}/api/webhooks/jira`;

    const webhooks =
      Array.isArray(body.webhooks) && body.webhooks.length > 0
        ? body.webhooks
        : [
            {
              events: ["jira:issue_created", "jira:issue_updated", "jira:issue_deleted"],
            },
          ];

    const results = await registerJiraWebhooks(userId, callbackUrl, webhooks);

    return NextResponse.json({ results });
  } catch (error: unknown) {
    if (error instanceof JiraAuthError) {
      await clearJiraCookie();
      return NextResponse.json({ error: error.message }, { status: 401 });
    }
    const message = error instanceof Error ? error.message : "";
    if (message === "No active Jira connection found for user.") {
      await clearJiraCookie();
      return NextResponse.json(
        { error: "Jira is not connected. Connect Jira first." },
        { status: 401 },
      );
    }
    // Jira returned 401/403: token missing webhook scope or expired
    const status = (error as { response?: { status?: number } })?.response?.status;
    if (status === 401 || status === 403) {
      return NextResponse.json(
        {
          error:
            "Jira rejected the request (401/403). Ensure your OAuth app has the manage:jira-webhook scope, then disconnect and reconnect Jira so a new token is issued.",
        },
        { status: 502 },
      );
    }
    console.error("Failed to register Jira webhooks:", error);
    return NextResponse.json({ error: "Failed to register webhooks." }, { status: 500 });
  }
}
