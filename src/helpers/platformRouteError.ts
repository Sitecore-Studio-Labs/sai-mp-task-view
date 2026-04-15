import { NextResponse } from "next/server";

import { JiraAuthError } from "@/exceptions/jiraErrors";
import { PlatformAuthError } from "@/exceptions/platformErrors";
import { clearPlatformCookie } from "@/helpers/platformCookies";
import { PlatformClientError } from "@/platforms/base/PlatformClientError";
import { JiraClientError } from "@/platforms/jira/JiraAdapter";

const NO_CONNECTION_MESSAGES = [
  "No active Jira connection found for user.",
  "No active Wrike connection found for user.",
];

const NO_SITE_SELECTED_MESSAGES = [
  "No Jira site selected. Please reconnect to Jira and select a site.",
  "No Wrike host configured. Please reconnect to Wrike.",
];

/**
 * Unified error handler for platform-neutral API routes.
 * Handles auth errors, client errors, and connection-loss scenarios.
 */
export async function handlePlatformError(error: unknown, context: string): Promise<NextResponse> {
  if (error instanceof PlatformAuthError || error instanceof JiraAuthError) {
    await clearPlatformCookie();
    return NextResponse.json({ error: error.message }, { status: 401 });
  }

  if (error instanceof PlatformClientError || error instanceof JiraClientError) {
    const status = error.statusCode >= 400 && error.statusCode < 500 ? error.statusCode : 400;
    return NextResponse.json({ error: error.message }, { status });
  }

  const message = error instanceof Error ? error.message : "";
  if (NO_CONNECTION_MESSAGES.includes(message)) {
    await clearPlatformCookie();
    return NextResponse.json({ error: "No active connection." }, { status: 401 });
  }

  if (NO_SITE_SELECTED_MESSAGES.includes(message)) {
    return NextResponse.json([], { status: 200 });
  }

  console.error(`${context}:`, error);
  return NextResponse.json({ error: `${context}.` }, { status: 500 });
}
