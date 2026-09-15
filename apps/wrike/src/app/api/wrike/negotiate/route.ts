import { WebPubSubServiceClient } from "@azure/web-pubsub";
import { type NextRequest, NextResponse } from "next/server";

import { getWrikeUserIdFromSession } from "@/helpers/wrikeUserId";
import { env } from "@/lib/config";

const WPS_HUB = "wrike";
const WPS_GROUP = "wrike_events";

/**
 * Negotiate endpoint for Azure Web PubSub (Wrike hub).
 *
 * Returns a short-lived client access URL that the browser uses to open a
 * WebSocket connection to the "wrike" hub, pre-joined to the "wrike_events"
 * group.  All Wrike task events are broadcast to this single group since
 * Wrike webhook payloads carry only task IDs (no project key).
 *
 * The connection string never leaves the server.
 *
 * GET /api/wrike/negotiate
 * Response: { url: string }
 *
 * Returns 401 if the caller has no valid Wrike session.
 * Returns 503 if AZURE_WEBPUBSUB_CONNECTION_STRING is not configured.
 */
export async function GET(request: NextRequest) {
  const userId = await getWrikeUserIdFromSession(request);
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
      groups: [WPS_GROUP],
      roles: [`webpubsub.joinLeaveGroup.${WPS_GROUP}`],
    });
    return NextResponse.json({ url: token.url });
  } catch (err) {
    console.error("[wrike/negotiate] Failed to generate client access token:", err);
    return NextResponse.json({ error: "Failed to generate access token" }, { status: 500 });
  }
}
