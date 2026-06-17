import { NextRequest, NextResponse } from "next/server";

import { withAdapter, withAdapterRaw } from "@/lib/platformRoute";

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ attachmentId: string }> },
) {
  const { attachmentId } = await params;

  return withAdapterRaw(request, async (adapter) => {
    const { data, contentType } = await adapter.getAttachmentContent(attachmentId);
    return new NextResponse(data.buffer as ArrayBuffer, {
      headers: {
        "Content-Type": contentType,
        "Content-Disposition": "inline",
      },
    });
  });
}

export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ attachmentId: string }> },
) {
  const { attachmentId } = await params;
  return withAdapter(request, async (adapter) => {
    await adapter.deleteAttachment(attachmentId);
    return null;
  });
}
