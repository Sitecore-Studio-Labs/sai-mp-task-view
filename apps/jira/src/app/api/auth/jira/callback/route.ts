import type { PlatformToken } from "@mp/task-core";
import crypto from "crypto";
import { type NextRequest, NextResponse } from "next/server";

import { env } from "@/lib/config";
import { JiraAdapter } from "@/platforms/jira/JiraAdapter";
import { createJiraSession, saveUserJiraConnection } from "@/services/jiraService";
import { JiraUser } from "@/types/jira";

/**
 * Timing-safe string comparison — prevents oracle attacks on the state value.
 * Returns false immediately (without calling timingSafeEqual) when lengths differ,
 * which is safe because state length is always public (64 hex chars).
 */
function timingSafeCompare(a: string, b: string): boolean {
  if (a.length !== b.length) return false;
  return crypto.timingSafeEqual(Buffer.from(a), Buffer.from(b));
}

/**
 * App Router handler for the Jira OAuth callback.
 * Atlassian redirects with only code (and state), not cloudId. We exchange the code
 * for tokens, then call the accessible-resources API to get the user's site (cloudId).
 */
export async function GET(request: NextRequest) {
  const { searchParams } = request.nextUrl;
  const code = searchParams.get("code");
  const returnedState = searchParams.get("state");

  if (!code) return NextResponse.json({ error: "Missing authorization code." }, { status: 400 });

  // CSRF: verify the state Atlassian echoed back matches what we stored in the cookie.
  const storedState = request.cookies.get("oauth_state")?.value;
  if (!storedState || !returnedState || !timingSafeCompare(returnedState, storedState)) {
    return NextResponse.json(
      { error: "OAuth state mismatch. Please try connecting again." },
      {
        status: 400,
      },
    );
  }

  const adapter = new JiraAdapter("https://api.atlassian.com");

  try {
    const token = await adapter.authenticate(code, env.JIRA_REDIRECT_URI);

    const resources = await getAccessibleResources(token);
    if (!resources.length) {
      return NextResponse.json({ error: "No Jira sites found.", status: 400 });
    }

    const first = resources[0];
    if (!first?.id) {
      return NextResponse.json(
        {
          error:
            "No Jira/Atlassian site found for this account. Check that the account has access to at least one site.",
        },
        { status: 400 },
      );
    }
    const user = await getUser(token, first.id);

    await saveUserJiraConnection({
      userId: user.accountId,
      jiraSite: "",
      jiraProject: "",
      token,
    });

    const sessionToken = crypto.randomBytes(32).toString("hex");
    const expiry = new Date(Date.now() + 1000 * 60 * 60 * 24 * 30);

    try {
      await createJiraSession(user.accountId, sessionToken, expiry);
    } catch (error) {
      console.error("Failed to create Jira session:", error);
      return NextResponse.json({ error: "Failed to create session." }, { status: 500 });
    }

    const origin = request.nextUrl.origin;
    const successUrl = `${origin}/task-manager-extension?jira=connected`;
    const response = NextResponse.redirect(successUrl);
    response.cookies.set("jira_session_token", sessionToken, {
      httpOnly: true,
      secure: true,
      sameSite: "none",
      path: "/",
      expires: expiry,
    });
    // Clear the CSRF state cookie now that the flow is complete.
    response.cookies.delete("oauth_state");
    return response;
  } catch (err) {
    console.error("OAuth callback error:", err);
    return NextResponse.json({ error: "Failed Jira OAuth flow" }, { status: 500 });
  }
}

/**
 * Fetches the list of Atlassian sites (Jira/Confluence) the access token can access.
 * Atlassian does not send cloudId in the OAuth redirect; we get it from this API.
 * @see https://developer.atlassian.com/cloud/oauth/getting-started/making-calls-to-api/
 */
async function getAccessibleResources(
  token: PlatformToken,
): Promise<Array<{ id: string; name: string; url: string }>> {
  const res = await fetch("https://api.atlassian.com/oauth/token/accessible-resources", {
    headers: {
      Authorization: `Bearer ${token.accessToken}`,
      Accept: "application/json",
    },
  });
  if (!res.ok) {
    throw new Error(`Accessible resources failed: ${res.status}`);
  }
  const data = (await res.json()) as Array<{
    id: string;
    name: string;
    url: string;
  }>;
  return data;
}

async function getUser(token: PlatformToken, cloudId: string): Promise<JiraUser> {
  const res = await fetch(`https://api.atlassian.com/ex/jira/${cloudId}/rest/api/3/myself`, {
    headers: {
      Authorization: `Bearer ${token.accessToken}`,
      Accept: "application/json",
    },
  });

  if (!res.ok) {
    throw new Error(`Failed to fetch Jira user: ${res.status}`);
  }
  return await res.json();
}
