import { cookies } from "next/headers";

export async function clearPlatformCookie(): Promise<void> {
  const c = await cookies();
  // Clear both legacy and new cookie names during transition
  c.set("jira_session_token", "", {
    httpOnly: true,
    secure: true,
    sameSite: "none",
    expires: new Date(0),
  });
  c.set("platform_session_token", "", {
    httpOnly: true,
    secure: true,
    sameSite: "none",
    expires: new Date(0),
  });
}
