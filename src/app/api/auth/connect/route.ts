import { NextRequest, NextResponse } from "next/server";

/**
 * Unified connect route. Redirects to the appropriate OAuth provider
 * based on the `?platform=` query parameter.
 *
 * GET /api/auth/connect?platform=jira  → Atlassian OAuth
 * GET /api/auth/connect?platform=wrike → Wrike OAuth
 */
export async function GET(request: NextRequest) {
  const platform = request.nextUrl.searchParams.get("platform");

  if (platform === "wrike") {
    return redirectToWrike();
  }

  // Default to Jira for backward compatibility
  return redirectToJira();
}

function redirectToJira(): NextResponse {
  const clientId = process.env.JIRA_CLIENT_ID;
  const redirectUri = process.env.JIRA_REDIRECT_URI;

  if (!clientId || !redirectUri) {
    return NextResponse.json(
      { error: "Jira OAuth is not configured. Check JIRA_CLIENT_ID and JIRA_REDIRECT_URI." },
      { status: 500 },
    );
  }

  const state = "demo-state";
  const authorizeUrl = new URL("https://auth.atlassian.com/authorize");
  authorizeUrl.searchParams.set("audience", "api.atlassian.com");
  authorizeUrl.searchParams.set("client_id", clientId);
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

function redirectToWrike(): NextResponse {
  const clientId = process.env.WRIKE_CLIENT_ID;
  const redirectUri = process.env.WRIKE_REDIRECT_URI;

  if (!clientId || !redirectUri) {
    return NextResponse.json(
      { error: "Wrike OAuth is not configured. Check WRIKE_CLIENT_ID and WRIKE_REDIRECT_URI." },
      { status: 500 },
    );
  }

  const authorizeUrl = new URL("https://login.wrike.com/oauth2/authorize/v4");
  authorizeUrl.searchParams.set("client_id", clientId);
  authorizeUrl.searchParams.set("response_type", "code");
  authorizeUrl.searchParams.set("redirect_uri", redirectUri);
  authorizeUrl.searchParams.set(
    "scope",
    "wsReadOnly,wsReadWrite,amReadOnlyWorkflow,amReadWriteWorkflow",
  );

  return NextResponse.redirect(authorizeUrl.toString());
}
