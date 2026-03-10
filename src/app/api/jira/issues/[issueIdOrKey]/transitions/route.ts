import { getIssueTransitions, issueStatusChange } from "@/services/jiraService";
import { cookies } from "next/headers";
import { NextRequest, NextResponse } from "next/server";
import { JiraAuthError } from "@/exceptions/jiraErrors";

interface RouteParams {
  params: {
    issueIdOrKey: string;
  };
}

export async function GET(request: NextRequest, { params }: RouteParams) {
  try {
    const userId = request.cookies.get("jira_user_id")?.value || "";

    const { issueIdOrKey } = await params;

    const transitions = await getIssueTransitions(issueIdOrKey, userId);

    return NextResponse.json({ transitions: transitions }, { status: 200 });
  } catch (error) {
    if (error instanceof JiraAuthError) {
      (await cookies()).set("jira_user_id", "", {
        httpOnly: true,
        secure: true,
        sameSite: "none",
        expires: new Date(0),
      });
      return NextResponse.json({ error: error.message }, { status: 401 });
    }
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

export async function POST(request: NextRequest, { params }: RouteParams) {
  try {
    const userId = request.cookies.get("jira_user_id")?.value || "";

    const { issueIdOrKey } = await params;
    const body = await request.json();
    const { transitionId } = body;

    if (!transitionId) {
      return NextResponse.json(
        { message: "transitionId is required" },
        { status: 400 },
      );
    }

    await issueStatusChange(issueIdOrKey, transitionId, userId);

    return NextResponse.json(
      { success: true, message: "Issue status updated successfully" },
      { status: 200 },
    );
  } catch (error) {
    if (error instanceof JiraAuthError) {
      (await cookies()).set("jira_user_id", "", {
        httpOnly: true,
        secure: true,
        sameSite: "none",
        expires: new Date(0),
      });
      return NextResponse.json({ error: error.message }, { status: 401 });
    }
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

    console.error("Failed to update Jira issue status:", error);

    return NextResponse.json(
      {
        error: "Failed to update Jira issue status.",
        message: error instanceof Error ? error.message : "Unknown error",
      },
      { status: 500 },
    );
  }
}
