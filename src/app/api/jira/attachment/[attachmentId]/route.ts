import { NextRequest, NextResponse } from "next/server";
import { getAttachmentContent } from "@/services/jiraService";

export async function GET(
  req: NextRequest,
  { params }: { params: { attachmentId: string } },
) {
  const demoUserId = "00000000-0000-0000-0000-000000000001";
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
      demoUserId,
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
