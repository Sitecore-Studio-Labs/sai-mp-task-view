import { resolveContentDisposition, resolveContentType } from "@mp/shared";
import { NextRequest, NextResponse } from "next/server";

import { withAdapter, withAdapterRaw } from "@/lib/platformRoute";

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ attachmentId: string }> },
) {
  const { attachmentId } = await params;

  const filename = request.nextUrl.searchParams.get("filename");
  return withAdapterRaw(request, async (adapter) => {
    const { data, contentType } = await adapter.getAttachmentContent(attachmentId);
    const finalContentType = resolveContentType(filename, contentType);
    const disposition = resolveContentDisposition(filename);
    return new NextResponse(data.buffer as ArrayBuffer, {
      headers: {
        "Content-Type": finalContentType,
        "Content-Disposition": disposition,
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
