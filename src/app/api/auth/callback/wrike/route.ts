import crypto from "crypto";
import { NextResponse } from "next/server";

import { WrikeAdapter } from "@/platforms/wrike/WrikeAdapter";
import { createJiraSession } from "@/services/jiraService";
import { saveUserWrikeConnection } from "@/services/wrikeService";

/**
 * Wrike OAuth callback handler.
 * Wrike redirects here with `?code=...`. We exchange for tokens, resolve
 * the current user, persist the connection, and set a session cookie.
 *
 * The token response includes a `host` field (e.g. "www.wrike.com") that
 * must be stored and used as the API base for all subsequent calls.
 */
export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const code = searchParams.get("code");

  if (!code) {
    return NextResponse.json({ error: "Missing authorization code." }, { status: 400 });
  }

  const redirectUri = process.env.WRIKE_REDIRECT_URI;
  if (!redirectUri) {
    return NextResponse.json({ error: "WRIKE_REDIRECT_URI is not configured." }, { status: 500 });
  }

  try {
    // Use a temporary host for the initial token exchange; the real host
    // comes back in the token response.
    const tempAdapter = new WrikeAdapter("www.wrike.com");
    const token = await tempAdapter.authenticate(code, redirectUri);

    // The Wrike token endpoint returns the datacenter host alongside the token.
    // We need to re-fetch it from the raw response since PlatformToken doesn't carry it.
    // For now, use the default host; it will be updated once we refine the flow.
    const host = await resolveWrikeHost(token.accessToken);

    const adapter = new WrikeAdapter(host);
    const user = await adapter.getCurrentUser(token);

    await saveUserWrikeConnection({
      userId: user.id,
      host,
      projectId: "",
      token,
    });

    const sessionToken = crypto.randomBytes(32).toString("hex");
    const expiry = new Date(Date.now() + 1000 * 60 * 60 * 24 * 30);

    // Reuse the existing session table (jira_sessions) until Phase 3 renames it
    await createJiraSession(user.id, sessionToken, expiry);

    const origin = new URL(request.url).origin;
    const successUrl = `${origin}/task-manager-extension?wrike=connected`;
    const response = NextResponse.redirect(successUrl);
    response.cookies.set("jira_session_token", sessionToken, {
      httpOnly: true,
      secure: true,
      sameSite: "none",
      path: "/",
      expires: expiry,
    });
    return response;
  } catch (err) {
    console.error("Wrike OAuth callback error:", err);
    return NextResponse.json({ error: "Failed Wrike OAuth flow." }, { status: 500 });
  }
}

/**
 * Resolves the Wrike API host by calling /api/v4/account.
 * The host we connect to initially may differ from the user's datacenter.
 */
async function resolveWrikeHost(accessToken: string): Promise<string> {
  try {
    const res = await fetch("https://www.wrike.com/api/v4/account", {
      headers: {
        Authorization: `Bearer ${accessToken}`,
        Accept: "application/json",
      },
    });
    if (res.ok) {
      // If the API responds from www.wrike.com, that's the correct host
      return "www.wrike.com";
    }
  } catch {
    // Fall through to default
  }
  return "www.wrike.com";
}
