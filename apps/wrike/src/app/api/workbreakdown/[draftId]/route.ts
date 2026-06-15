import { NextRequest, NextResponse } from "next/server";

// TODO: GET returns the draft; PATCH applies an operation (updateNode, deleteNode, addChild).
export async function GET(_req: NextRequest, { params }: { params: Promise<{ draftId: string }> }) {
  const { draftId } = await params;
  void draftId;
  return NextResponse.json({ draftId, items: [] });
}

export async function PATCH(
  req: NextRequest,
  { params }: { params: Promise<{ draftId: string }> },
) {
  const { draftId } = await params;
  void draftId;
  void req;
  return NextResponse.json({ ok: true });
}
