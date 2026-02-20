import { NextResponse } from "next/server";
import { getDetailsForIssue } from "@/services/jiraService";

export async function GET(
  request: Request,
  { params }: { params: Promise<{ issueIdOrKey: string }> },
) {
  const demoUserId = "00000000-0000-0000-0000-000000000001";

  try {
    const resolvedParams = await params;
    const issueIdOrKey = resolvedParams.issueIdOrKey;

    const issue = await getDetailsForIssue(demoUserId, issueIdOrKey);

    return NextResponse.json(issue);
  } catch (error) {
    console.error("Failed to load Jira issue:", error);
    return NextResponse.json(
      { error: "Failed to load Jira issue.", details: error },
      { status: 500 },
    );
  }
}