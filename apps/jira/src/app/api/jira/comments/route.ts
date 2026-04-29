import { NextRequest, NextResponse } from "next/server";

import { withAdapter } from "@/lib/platformRoute";
import type { CreateCommentPayload } from "@/types/jira";

export async function GET(request: NextRequest) {
  const issueIdOrKey = request.nextUrl.searchParams.get("issueIdOrKey");

  if (!issueIdOrKey) {
    return NextResponse.json(
      { error: "issueIdOrKey query parameter is required" },
      { status: 400 },
    );
  }

  return withAdapter(request, (adapter) => adapter.getComments(issueIdOrKey));
}

export async function POST(request: NextRequest) {
  let body: CreateCommentPayload;
  try {
    body = (await request.json()) as CreateCommentPayload;
  } catch {
    return NextResponse.json({ error: "Invalid JSON body." }, { status: 400 });
  }

  if (!body.text) {
    return NextResponse.json({ error: "text is required" }, { status: 400 });
  }

  return withAdapter(request, (adapter) =>
    adapter.createComment({
      issueIdOrKey: body.issueIdOrKey,
      text: body.text,
      replyToCommentId: body.replyToCommentId,
      replyToAuthorId: body.replyToAuthorAccountId,
      replyToAuthorDisplayName: body.replyToAuthorDisplayName,
    }),
  );
}
