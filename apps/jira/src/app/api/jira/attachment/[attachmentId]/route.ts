import { NextRequest, NextResponse } from "next/server";

import { withAdapter, withAdapterRaw } from "@/lib/platformRoute";

const UPLOAD_SEGMENT = "upload";

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ attachmentId: string }> },
) {
  const { attachmentId } = await params;

  return withAdapterRaw(request, async (adapter) => {
    const { data, contentType } = (await adapter.getAttachmentContent(attachmentId)) as {
      data: Uint8Array;
      contentType: string;
    };
    return new NextResponse(data.buffer as ArrayBuffer, {
      headers: {
        "Content-Type": contentType,
        "Content-Disposition": "inline",
      },
    });
  });
}

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ attachmentId: string }> },
) {
  const { attachmentId } = await params;
  if (attachmentId !== UPLOAD_SEGMENT) {
    return NextResponse.json({ error: "Not found." }, { status: 404 });
  }

  const issueIdOrKey = request.nextUrl.searchParams.get("issueIdOrKey")?.trim();
  if (!issueIdOrKey) {
    return NextResponse.json(
      { error: "Missing required query parameter: issueIdOrKey" },
      { status: 400 },
    );
  }

  const formData = await request.formData();
  const file = formData.get("file");
  if (!file || !(file instanceof File)) {
    return NextResponse.json(
      { error: "Missing or invalid file in form (field: file)" },
      { status: 400 },
    );
  }

  const buffer = Buffer.from(await file.arrayBuffer());
  return withAdapter(request, async (adapter) => {
    await adapter.addAttachment(issueIdOrKey, {
      buffer,
      fileName: file.name,
      mimeType: file.type || "application/octet-stream",
    });
    return { success: true };
  });
}

export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ attachmentId: string }> },
) {
  const { attachmentId } = await params;
  return withAdapter(request, async (adapter) => {
    await adapter.deleteAttachment(attachmentId);
    return { success: true };
  });
}
