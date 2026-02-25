import { NextRequest, NextResponse } from "next/server";
import { getProjectIssueStatuses } from "@/services/jiraService";

export async function GET(
  request: NextRequest,
  { params }: { params: { projectKey: string } },
) {
  const demoUserId = "00000000-0000-0000-0000-000000000001";
  try {
    const resolvedParams = await params;
    const projectKey = resolvedParams.projectKey;

    const statuses = await getProjectIssueStatuses(demoUserId, projectKey);

    return NextResponse.json(statuses);
  } catch (error) {
    console.error("Failed to fetch project issue statuses:", error);
    return NextResponse.json(
      { message: "Failed to fetch statuses" },
      { status: 500 },
    );
  }
}
