import { NextRequest, NextResponse } from "next/server";
import { cookies } from "next/headers";
import { getAttachmentContent } from "@/services/jiraService";

export async function GET(
  req: NextRequest,
  { params }: { params: Promise<{ attachmentId: string }> },
) {
  const userId = req.cookies.get("jira_user_id")?.value || "";
  const resolvedParams = await params;
  const attachmentId = resolvedParams.attachmentId;

  if (!attachmentId) {
    return NextResponse.json(
      { error: "Missing required query parameter: attachmentId" },
      { status: 400 },
    );
  }

  try {
    const { data, contentType } = await getAttachmentContent(
      attachmentId,
      userId,
    );

    return new NextResponse(data, {
      headers: {
        "Content-Type": contentType,
        "Content-Disposition": "inline",
      },
    });
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

    console.error("Failed to load Attachment:", error);

    return NextResponse.json(
      { error: "Failed to load attachment." },
      { status: 500 },
    );
  }
}
