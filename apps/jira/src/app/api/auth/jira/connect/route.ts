import crypto from "crypto";
import { NextResponse } from "next/server";

import { env } from "@/lib/config";

/**
 * Initiates the Jira OAuth 2.0 (3LO) flow.
 * Generates a cryptographically random state token, stores it in a short-lived
 * HTTP-only cookie, and redirects to Atlassian's authorization endpoint.
 * The callback route verifies the returned state against this cookie (CSRF protection).
 */
export async function GET() {
  const state = crypto.randomBytes(32).toString("hex");

  const authorizeUrl = new URL("https://auth.atlassian.com/authorize");
  authorizeUrl.searchParams.set("audience", "api.atlassian.com");
  authorizeUrl.searchParams.set("client_id", env.JIRA_CLIENT_ID);
  // manage:jira-webhook required for POST /rest/api/3/webhook (register dynamic webhooks)
  authorizeUrl.searchParams.set(
    "scope",
    "read:jira-user read:jira-work write:jira-work manage:jira-webhook offline_access",
  );
  authorizeUrl.searchParams.set("redirect_uri", env.JIRA_REDIRECT_URI);
  authorizeUrl.searchParams.set("state", state);
  authorizeUrl.searchParams.set("response_type", "code");
  authorizeUrl.searchParams.set("prompt", "consent");

  const response = NextResponse.redirect(authorizeUrl.toString());
  // sameSite: "none" matches the session cookie — required for third-party (iframe) contexts.
  response.cookies.set("oauth_state", state, {
    httpOnly: true,
    secure: true,
    sameSite: "none",
    path: "/",
    maxAge: 60 * 10, // 10 minutes — enough time to complete the OAuth flow
  });
  return response;
}
