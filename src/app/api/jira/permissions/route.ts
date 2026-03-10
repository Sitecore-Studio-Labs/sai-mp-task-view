import { NextRequest, NextResponse } from "next/server";
import { cookies } from "next/headers";
import { getDeletePermissionForIssue } from "@/services/jiraService";
import axios from "axios";
import { JiraAuthError } from "@/exceptions/jiraErrors";

export async function GET(request: NextRequest) {
  const userId = request.cookies.get("jira_user_id")?.value || "";

  const { searchParams } = new URL(request.url);
  const issueIdOrKey = searchParams.get("issueIdOrKey");

  if (!issueIdOrKey) {
    return NextResponse.json(
      { error: "issueIdOrKey query parameter is required" },
      { status: 400 },
    );
  }

  try {
    const canDelete = await getDeletePermissionForIssue(userId, issueIdOrKey);

    return NextResponse.json({ canDelete });
  } catch (error: unknown) {
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

    if (axios.isAxiosError(error)) {
      return NextResponse.json(
        error.response?.data ?? { error: "Failed to check permission" },
        { status: error.response?.status ?? 500 },
      );
    }

    return NextResponse.json(
      { error: "Unexpected server error" },
      { status: 500 },
    );
  }
}
