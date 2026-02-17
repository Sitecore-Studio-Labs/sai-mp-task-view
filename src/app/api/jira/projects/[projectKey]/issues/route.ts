import { NextResponse } from "next/server";
import { getJiraIssuesForProject } from "@/services/jiraService";

export async function GET(
  request: Request,
  { params }: { params: Promise<{ projectKey: string }> },
) {
  const demoUserId = "00000000-0000-0000-0000-000000000001";

  try {
    const resolvedParams = await params;
    const projectKey = resolvedParams.projectKey;

    const issues = await getJiraIssuesForProject(demoUserId, projectKey);

    return NextResponse.json(issues);
  } catch (error) {
    console.error("Failed to load Jira issues:", error);
    return NextResponse.json(
      { error: "Failed to load Jira issues.", details: error },
      { status: 500 },
    );
  }
}
