import { WebPubSubServiceClient } from "@azure/web-pubsub";
import { type NextRequest, NextResponse } from "next/server";

import { getJiraUserIdFromSession } from "@/helpers/jiraUserId";
import { env } from "@/lib/config";

const WPS_HUB = "jira";

/**
 * Negotiate endpoint for Azure Web PubSub (Jira hub).
 *
 * Returns a short-lived client access URL that the browser uses to open a
 * WebSocket connection to the "jira" hub.  The browser then joins the group
 * named after the active projectKey to receive per-project push notifications.
 *
 * The connection string never leaves the server.
 *
 * GET /api/jira/negotiate
 * Response: { url: string }
 *
 * Returns 401 if the caller has no valid Jira session.
 * Returns 503 if AZURE_WEBPUBSUB_CONNECTION_STRING is not configured.
 */
export async function GET(request: NextRequest) {
  const userId = await getJiraUserIdFromSession(request);
  if (!userId) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  if (!env.AZURE_WEBPUBSUB_CONNECTION_STRING) {
    return NextResponse.json({ error: "Web PubSub not configured" }, { status: 503 });
  }

  try {
    const serviceClient = new WebPubSubServiceClient(
      env.AZURE_WEBPUBSUB_CONNECTION_STRING,
      WPS_HUB,
    );
    const token = await serviceClient.getClientAccessToken({
      userId,
      // Grant join/leave on any group so the browser can subscribe to the
      // active projectKey group (and switch groups when the project changes).
      roles: ["webpubsub.joinLeaveGroup"],
    });
    return NextResponse.json({ url: token.url });
  } catch (err) {
    console.error("[jira/negotiate] Failed to generate client access token:", err);
    return NextResponse.json({ error: "Failed to generate access token" }, { status: 500 });
  }
}
