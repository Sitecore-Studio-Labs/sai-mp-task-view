import { NextRequest } from "next/server";

import { withAdapter } from "@/lib/platformRoute";

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ attachmentId: string }> },
) {
  const { attachmentId } = await params;
  return withAdapter(request, (adapter) => adapter.getAttachmentContent(attachmentId));
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
