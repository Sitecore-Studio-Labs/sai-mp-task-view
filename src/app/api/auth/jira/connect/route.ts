import { NextResponse } from "next/server";

/**
 * App Router route handler that initiates the Jira OAuth 2.0 (3LO) flow.
 * It returns a redirect response to Atlassian's authorization endpoint.
 */
export async function GET() {
  const clientId = process.env.JIRA_CLIENT_ID;
  const redirectUri = process.env.JIRA_REDIRECT_URI;

  if (!clientId || !redirectUri) {
    return NextResponse.json(
      { error: "Jira OAuth is not configured. Check JIRA_CLIENT_ID and JIRA_REDIRECT_URI." },
      { status: 500 }
    );
  }

  // In a real implementation, generate a secure random state tied to the current user/session.
  const state = "demo-state";

  const authorizeUrl = new URL("https://auth.atlassian.com/authorize");
  authorizeUrl.searchParams.set("audience", "api.atlassian.com");
  authorizeUrl.searchParams.set("client_id", clientId);
  // manage:jira-webhook required for POST /rest/api/3/webhook (register dynamic webhooks)
  authorizeUrl.searchParams.set(
    "scope",
    "read:jira-user read:jira-work write:jira-work manage:jira-webhook offline_access",
  );
  authorizeUrl.searchParams.set("redirect_uri", redirectUri);
  authorizeUrl.searchParams.set("state", state);
  authorizeUrl.searchParams.set("response_type", "code");
  authorizeUrl.searchParams.set("prompt", "consent");

  return NextResponse.redirect(authorizeUrl.toString());
}

