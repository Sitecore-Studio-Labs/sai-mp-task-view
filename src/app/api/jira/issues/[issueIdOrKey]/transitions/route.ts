import { getIssueTransitions, issueStatusChange } from '@/services/jiraService';
import { NextRequest, NextResponse } from 'next/server';

interface RouteParams {
  params: {
    issueIdOrKey: string;
  };
}

export async function GET(
  req: NextRequest,
  { params }: RouteParams,
) {
  try {
    const demoUserId = "00000000-0000-0000-0000-000000000001";

    const { issueIdOrKey } = await params;

    const transitions = await getIssueTransitions(
      issueIdOrKey,
      demoUserId,
    );

    return NextResponse.json(
      { transitions: transitions },
      { status: 200 },
    );
  } catch (error) {
    console.error("Failed to fetch transitions:", error);

    return NextResponse.json(
      {
        error: "Failed to fetch transitions",
        message: error instanceof Error ? error.message : "Unknown error",
      },
      { status: 500 },
    );
  }
}

export async function POST(
  req: NextRequest,
  { params }: RouteParams,
) {
  try {
    const demoUserId = "00000000-0000-0000-0000-000000000001";

    const { issueIdOrKey } = await params;
    const body = await req.json();
    const { transitionId } = body;

    if (!transitionId) {
      return NextResponse.json(
        { message: 'transitionId is required' },
        { status: 400 },
      );
    }

    await issueStatusChange(issueIdOrKey, transitionId, demoUserId);

    return NextResponse.json(
      { success: true, message: 'Issue status updated successfully' },
      { status: 200 },
    );
  } catch (error) {
    console.error("Failed to update Jira issue status:", error);

    return NextResponse.json(
      { error: "Failed to update Jira issue status.", message: error instanceof Error ? error.message : "Unknown error" },
      { status: 500 }
    );
  }
}