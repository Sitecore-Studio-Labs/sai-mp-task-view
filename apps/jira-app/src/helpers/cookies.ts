import { cookies } from "next/headers";

export async function clearJiraCookie(): Promise<void> {
  const c = await cookies();
  c.set("jira_session_token", "", {
    httpOnly: true,
    secure: true,
    sameSite: "none",
    expires: new Date(0),
  });
}
