import { NextRequest, NextResponse } from "next/server";

import { withAdapter } from "@/lib/platformRoute";

export async function GET(
  request: NextRequest,
  context: { params: Promise<{ commentId: string }> },
) {
  const { commentId } = await context.params;
  const issueIdOrKey = request.nextUrl.searchParams.get("issueIdOrKey");

  if (!issueIdOrKey) {
    return NextResponse.json(
      { error: "issueIdOrKey query parameter is required" },
      { status: 400 },
    );
  }

  return withAdapter(request, (adapter) => adapter.getComment(issueIdOrKey, commentId));
}
