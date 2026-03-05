import { NextRequest, NextResponse } from "next/server";
import { getProjectIssueStatuses } from "@/services/jiraService";

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
    console.error("Failed to fetch project issue statuses:", error);
    return NextResponse.json(
      { message: "Failed to fetch statuses" },
      { status: 500 },
    );
  }
}
