import { NextResponse } from "next/server";
import { getJiraCurrentUser } from "@/services/jiraService";

export async function GET() {
  const demoUserId = "00000000-0000-0000-0000-000000000001";

  try {
    const user = await getJiraCurrentUser(demoUserId);
    return NextResponse.json(user);
  } catch (error) {
    const message = error instanceof Error ? error.message : "";
    if (message === "No active Jira connection found for user.") {
      return NextResponse.json(
        { error: "No active Jira connection." },
        { status: 401 },
      );
    }
    console.error("Failed to get Jira current user:", error);
    return NextResponse.json(
      { error: "Failed to get current user." },
      { status: 500 },
    );
  }
}
