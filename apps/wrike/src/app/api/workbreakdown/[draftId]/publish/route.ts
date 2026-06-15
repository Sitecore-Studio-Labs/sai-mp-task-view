import { NextRequest, NextResponse } from "next/server";

// TODO: Create platform issues from the draft items in order (parents first).
export async function POST(req: NextRequest, { params }: { params: Promise<{ draftId: string }> }) {
  const { draftId } = await params;
  void draftId;
  void req;
  return NextResponse.json({ draftId, created: [], errors: [], status: "completed" });
}
