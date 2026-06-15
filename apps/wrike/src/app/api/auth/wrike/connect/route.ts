import { getClientKey, rateLimit } from "@mp/shared";
import crypto from "crypto";
import { type NextRequest, NextResponse } from "next/server";

import { authStrategy } from "@/lib/authStrategy";

/**
 * Initiates the Wrike OAuth flow.
 * Generates a CSRF state token, stores it in a short-lived cookie, and redirects
 * to the platform's authorization endpoint. The callback route verifies this state.
 */
export async function GET(request: NextRequest) {
  const { allowed, retryAfter } = rateLimit(getClientKey(request), 20, 60_000);
  if (!allowed) {
    return NextResponse.json(
      { error: "Too many requests. Please try again later." },
      { status: 429, headers: { "Retry-After": String(retryAfter) } },
    );
  }

  const state = crypto.randomBytes(32).toString("hex");
  const authorizeUrl = authStrategy.getConnectUrl(state);
  const response = NextResponse.redirect(authorizeUrl);
  response.cookies.set("oauth_state", state, {
    httpOnly: true,
    secure: true,
    sameSite: "none",
    path: "/",
    maxAge: 60 * 10, // 10 minutes — enough for the user to complete the OAuth flow
  });
  return response;
}
