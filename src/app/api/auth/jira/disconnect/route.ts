import { NextRequest, NextResponse } from "next/server";
import { disconnectUserJira } from "@/services/jiraService";
import { cookies } from "next/headers";
import { JiraAuthError } from "@/exceptions/jiraErrors";

export async function POST(request: NextRequest) {
  const userId = request.cookies.get("jira_user_id")?.value || "";
  try {
    await disconnectUserJira(userId);
    (await cookies()).set("jira_user_id", "", {
      httpOnly: true,
      secure: true,
      sameSite: "none",
      expires: new Date(0),
    });
    return NextResponse.json({ success: true });
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
     
    console.error("Disconnect failed:", error);
    return NextResponse.json(
      { error: "Failed to disconnect" },
      { status: 500 },
    );
  }
}
