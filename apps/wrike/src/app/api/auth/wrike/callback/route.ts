import { getClientKey, rateLimit } from "@mp/shared";
import { SupabaseTokenStore } from "@mp/token-storage";
import crypto from "crypto";
import { type NextRequest, NextResponse } from "next/server";

import { env } from "@/lib/config";
import { WRIKE_STORE_CONFIG } from "@/lib/storeConfig";
import { createSupabaseServerClient } from "@/lib/supabaseClient";
import { normalizeWrikeHost } from "@/lib/wrikeHost";

const WRIKE_TOKEN_URL = "https://login.wrike.com/oauth2/token";

function timingSafeCompare(a: string, b: string): boolean {
  if (a.length !== b.length) return false;
  return crypto.timingSafeEqual(Buffer.from(a), Buffer.from(b));
}

export async function GET(request: NextRequest) {
  const { allowed, retryAfter } = rateLimit(getClientKey(request), 10, 60_000);
  if (!allowed) {
    return NextResponse.json(
      { error: "Too many requests. Please try again later." },
      { status: 429, headers: { "Retry-After": String(retryAfter) } },
    );
  }

  const { searchParams } = new URL(request.url);
  const code = searchParams.get("code");
  const state = searchParams.get("state");

  const cookieState = request.cookies.get("oauth_state")?.value;
  if (!code || !state || !cookieState || !timingSafeCompare(state, cookieState)) {
    return NextResponse.json({ error: "Invalid OAuth state" }, { status: 400 });
  }

  const tokenRes = await fetch(WRIKE_TOKEN_URL, {
    method: "POST",
    headers: { "Content-Type": "application/x-www-form-urlencoded" },
    body: new URLSearchParams({
      client_id: env.WRIKE_CLIENT_ID,
      client_secret: env.WRIKE_CLIENT_SECRET,
      grant_type: "authorization_code",
      code,
      redirect_uri: env.WRIKE_REDIRECT_URI,
    }).toString(),
  });
  if (!tokenRes.ok) {
    const detail = await tokenRes.text().catch(() => "");
    console.error("Wrike token exchange failed:", tokenRes.status, detail);
    return NextResponse.json({ error: "Token exchange failed" }, { status: 502 });
  }
  const tokenData = (await tokenRes.json()) as {
    access_token: string;
    refresh_token?: string;
    expires_in?: number;
    host?: string; // data-centre host — MUST be validated before use
  };
  const { access_token, refresh_token, expires_in } = tokenData;
  if (!access_token) {
    return NextResponse.json({ error: "Token exchange returned no access token" }, { status: 502 });
  }
  const expiry = expires_in ? new Date(Date.now() + expires_in * 1000).toISOString() : undefined;

  // Validate and normalise the data-centre host from the token response.
  // Skipping this check would allow SSRF — always validate dynamic hosts.
  let platformSite: string;
  try {
    platformSite = normalizeWrikeHost(tokenData.host ?? "");
  } catch (err) {
    const msg = err instanceof Error ? err.message : "Invalid host in token response.";
    console.error("[callback] Host validation failed:", msg, { host: tokenData.host });
    return NextResponse.json({ error: msg }, { status: 502 });
  }

  // Fetch the platform user profile to get a stable userId.
  const profileRes = await fetch(`${platformSite}/api/v4/contacts?me=true`, {
    headers: { Authorization: `Bearer ${access_token}` },
  });
  if (!profileRes.ok) {
    return NextResponse.json({ error: "Could not fetch user profile" }, { status: 502 });
  }
  const profileData = (await profileRes.json()) as Record<string, unknown>;
  // Extract userId via path: data[0].id
  const userId = String((profileData?.data as Record<string, unknown>[])?.[0]?.id ?? "");
  if (!userId) {
    return NextResponse.json({ error: "Could not resolve user id from profile" }, { status: 502 });
  }

  const store = new SupabaseTokenStore(createSupabaseServerClient(), WRIKE_STORE_CONFIG);
  await store.saveConnection({
    userId,
    platformSite,
    platformProject: "",
    token: {
      accessToken: access_token,
      refreshToken: refresh_token,
      expiry,
      tokenType: "bearer",
    },
  });

  const sessionToken = crypto.randomBytes(32).toString("hex");
  const sessionExpiry = new Date(Date.now() + 7 * 24 * 60 * 60 * 1000);
  await store.createSession(userId, sessionToken, sessionExpiry);

  const response = NextResponse.redirect(
    new URL("/task-manager-extension?wrike=connected", env.NEXT_PUBLIC_APP_URL ?? request.url),
  );
  response.cookies.delete("oauth_state");
  response.cookies.set("wrike_session", sessionToken, {
    httpOnly: true,
    secure: true,
    sameSite: "none",
    path: "/",
    expires: sessionExpiry,
  });
  return response;
}
