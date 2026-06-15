import { NextRequest, NextResponse } from "next/server";

import { withAdapter } from "@/lib/platformRoute";

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ issueIdOrKey: string }> },
) {
  const { issueIdOrKey } = await params;
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
