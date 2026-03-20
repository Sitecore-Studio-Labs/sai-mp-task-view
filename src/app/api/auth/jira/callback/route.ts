import { cookies } from "next/headers";
import { NextResponse } from "next/server";

import { JiraAdapter } from "@/platforms/jira/JiraAdapter";
import { saveUserJiraConnection } from "@/services/jiraService";
import { JiraUser } from "@/types/jira";
import type { PlatformToken } from "@/types/platform";

/**
 * App Router handler for the Jira OAuth callback.
 * Atlassian redirects with only code (and state), not cloudId. We exchange the code
 * for tokens, then call the accessible-resources API to get the user's site (cloudId).
 */
export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const code = searchParams.get("code");
  if (!code) return NextResponse.json({ error: "Missing authorization code." }, { status: 400 });

  const redirectUri = process.env.JIRA_REDIRECT_URI;
  if (!redirectUri) {
    return NextResponse.json({ error: "JIRA_REDIRECT_URI is not configured." }, { status: 500 });
  }
  const adapter = new JiraAdapter("https://api.atlassian.com");

  try {
    const token = await adapter.authenticate(code, redirectUri);

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
    const user = await getUser(token, first.id); // use first to get userId only
    const isHttps = new URL(request.url).protocol === "https:";
    (await cookies()).set("jira_user_id", user.accountId, {
      httpOnly: true,
      secure: isHttps,
      sameSite: isHttps ? "none" : "lax",
      path: "/",
    });

    await saveUserJiraConnection({
      userId: user.accountId,
      jiraSite: first.id,
      token,
    });

    const origin = new URL(request.url).origin;
    const successUrl = `${origin}/task-manager-extension?jira=connected`;
    return NextResponse.redirect(successUrl);
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
