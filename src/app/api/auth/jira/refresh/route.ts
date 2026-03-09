import { NextRequest, NextResponse } from "next/server";
import { cookies } from "next/headers";
import { refreshUserJiraToken, disconnectUserJira } from "@/services/jiraService";

/**
 * Refresh endpoint used by the axios interceptors.
 * It refreshes the Jira access token for the current user and
 * returns the new PlatformToken.
 */
export async function POST(request: NextRequest) {
  // For this starter we again assume a single demo user. Replace with your auth integration.
  const userId = request.cookies.get("jira_user_id")?.value || "";

  try {
    const newToken = await refreshUserJiraToken(userId);
    return NextResponse.json(newToken);
  } catch (error) {
    console.error("Failed to refresh Jira token:", error);

    if (userId) {
      try {
        await disconnectUserJira(userId);
      } catch (disconnectError) {
        console.error("Failed to mark Jira connection inactive on refresh failure:", disconnectError);
      }
    }

    (await cookies()).set("jira_user_id", "", {
      httpOnly: true,
      secure: true,
      sameSite: "none",
      expires: new Date(0),
    });

    return NextResponse.json(
      { error: "Jira session has expired. Please reconnect Jira." },
      { status: 401 },
    );
  }
}
