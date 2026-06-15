import { cookies } from "next/headers";

/** Must match the session cookie set in `api/auth/wrike/callback`. */
export const WRIKE_SESSION_COOKIE = "wrike_session";

export async function clearWrikeCookie(): Promise<void> {
  const c = await cookies();
  c.set(WRIKE_SESSION_COOKIE, "", {
    httpOnly: true,
    secure: true,
    sameSite: "none",
    expires: new Date(0),
    path: "/",
  });
}
