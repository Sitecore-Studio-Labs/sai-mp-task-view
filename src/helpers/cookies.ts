import { cookies } from "next/headers";

export async function clearJiraCookie(): Promise<void> {
  const c = await cookies();
  const isHttps = process.env.NODE_ENV === "production";
  c.set("jira_user_id", "", {
    httpOnly: true,
    secure: isHttps,
    sameSite: isHttps ? "none" : "lax",
    path: "/",
    expires: new Date(0),
  });
}
