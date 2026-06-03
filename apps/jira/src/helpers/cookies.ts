import { cookies } from "next/headers";

export const JIRA_SESSION_COOKIE = "jira_session_token";

export async function clearJiraCookie(): Promise<void> {
  const c = await cookies();
  c.set(JIRA_SESSION_COOKIE, "", {
    httpOnly: true,
    secure: true,
    sameSite: "none",
    expires: new Date(0),
  });
}
