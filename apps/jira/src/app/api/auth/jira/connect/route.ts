import crypto from "crypto";
import { NextResponse } from "next/server";

import { authStrategy } from "@/lib/authStrategy";

/**
 * Initiates the Jira OAuth 2.0 (3LO) flow.
 * Generates a cryptographically random state token, stores it in a short-lived
 * HTTP-only cookie, and redirects to Atlassian's authorization endpoint.
 * The callback route verifies the returned state against this cookie (CSRF protection).
 */
export async function GET() {
  const state = crypto.randomBytes(32).toString("hex");
  const authorizeUrl = authStrategy.getConnectUrl(state);

  const response = NextResponse.redirect(authorizeUrl);
  // sameSite: "none" required for third-party (iframe) contexts.
  response.cookies.set("oauth_state", state, {
    httpOnly: true,
    secure: true,
    sameSite: "none",
    path: "/",
    maxAge: 60 * 10,
  });
  return response;
}
