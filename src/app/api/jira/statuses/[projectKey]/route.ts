import { NextRequest, NextResponse } from "next/server";
import { getProjectIssueStatuses } from "@/services/jiraService";
import { cookies } from "next/headers";

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ projectKey: string }> },
) {
  const userId = request.cookies.get("jira_user_id")?.value || "";
  try {
    const { projectKey } = await params;

    const statuses = await getProjectIssueStatuses(userId, projectKey);

    return NextResponse.json(statuses);
  } catch (error) {
    const message = error instanceof Error ? error.message : "";
    if (message === "No active Jira connection found for user.") {
      (await cookies()).set("jira_user_id", "", {
        httpOnly: true,
        secure: true,
        sameSite: "none",
        expires: new Date(0),
      });
      return NextResponse.json(
        { error: "No active Jira connection." },
        { status: 401 },
      );
    }

    console.error("Failed to fetch project issue statuses:", error);
    return NextResponse.json(
      { message: "Failed to fetch statuses" },
      { status: 500 },
    );
  }
}
