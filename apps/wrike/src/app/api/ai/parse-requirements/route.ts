import { NextRequest, NextResponse } from "next/server";

// TODO: Call your AI service to parse requirements text into a work breakdown draft.
export async function POST(req: NextRequest) {
  void req;
  return NextResponse.json({ draftId: "" });
}
