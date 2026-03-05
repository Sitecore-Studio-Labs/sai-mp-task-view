import { NextResponse } from "next/server";
import { JiraAdapter } from "@/platforms/jira/JiraAdapter";
import { saveUserJiraConnection } from "@/services/jiraService";
import type { PlatformToken } from "@/types/platform";
import { JiraUser } from "@/types/jira";
import { cookies } from "next/headers";

/**
 * Fetches the list of Atlassian sites (Jira/Confluence) the access token can access.
 * Atlassian does not send cloudId in the OAuth redirect; we get it from this API.
 * @see https://developer.atlassian.com/cloud/oauth/getting-started/making-calls-to-api/
 */
async function getAccessibleResources(
  token: PlatformToken,
): Promise<Array<{ id: string; name: string; url: string }>> {
  const res = await fetch(
    "https://api.atlassian.com/oauth/token/accessible-resources",
    {
      headers: {
        Authorization: `Bearer ${token.accessToken}`,
        Accept: "application/json",
      },
    },
  );
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

async function getUser(
  token: PlatformToken,
  cloudId: string,
): Promise<JiraUser> {
  const res = await fetch(
    `https://api.atlassian.com/ex/jira/${cloudId}/rest/api/3/myself`,
    {
      headers: {
        Authorization: `Bearer ${token.accessToken}`,
        Accept: "application/json",
      },
    },
  );

  if (!res.ok) {
    throw new Error(`Failed to fetch Jira user: ${res.status}`);
  }
  return await res.json();
}

/**
 * App Router handler for the Jira OAuth callback.
 * Atlassian redirects with only code (and state), not cloudId. We exchange the code
 * for tokens, then call the accessible-resources API to get the user's site (cloudId).
 */
export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const code = searchParams.get("code");

  if (!code) {
    return NextResponse.json(
      { error: "Missing authorization code." },
      { status: 400 },
    );
  }

  const redirectUri = process.env.JIRA_REDIRECT_URI;
  if (!redirectUri) {
    return NextResponse.json(
      { error: "JIRA_REDIRECT_URI is not configured." },
      { status: 500 },
    );
  }

  try {
    // Exchange code for tokens (no cloudId needed for this step).
    const adapter = new JiraAdapter("https://api.atlassian.com");
    const token = await adapter.authenticate(code, redirectUri);

    const resources = await getAccessibleResources(token);
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
    const cloudId = first.id;
    const user = await getUser(token, cloudId);

    await saveUserJiraConnection({
      userId: user.accountId,
      jiraSite: cloudId,
      token,
    });

    (await cookies()).set("jira_user_id", user.accountId, {
      httpOnly: true,
      secure: true,
      sameSite: "none",
    });

    const origin = new URL(request.url).origin;
    const successUrl = `${origin}/task-manager-extension?jira=connected`;
    return NextResponse.redirect(successUrl);
  } catch (error: unknown) {
    let detail = "Unknown error";
    let status = 500;

    if (error instanceof Error) {
      detail = error.message;
    }
    if (
      typeof error === "object" &&
      error !== null &&
      "response" in error &&
      typeof (error as { response?: { data?: unknown; status?: number } })
        .response === "object"
    ) {
      const res = (error as { response: { data?: unknown; status?: number } })
        .response;
      status = res.status ?? 500;
      const data = res.data;
      if (data && typeof data === "object" && "error_description" in data) {
        detail = String(
          (data as { error_description?: string }).error_description,
        );
      } else if (data && typeof data === "object" && "error" in data) {
        detail = String((data as { error?: string }).error);
      } else if (data && typeof data === "object" && "message" in data) {
        detail = String((data as { message?: string }).message);
      }
    }

     
    console.error("Jira OAuth callback error:", error);
    return NextResponse.json(
      { error: "Failed to complete Jira OAuth flow.", detail },
      { status: status >= 400 && status < 600 ? status : 500 },
    );
  }
}
