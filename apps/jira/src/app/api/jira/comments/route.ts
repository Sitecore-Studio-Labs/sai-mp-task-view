import { NextRequest, NextResponse } from "next/server";

import { withAdapter } from "@/lib/platformRoute";
import { createCommentSchema, parseBody } from "@/lib/schemas/route-schemas";

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
  let raw: unknown;
  try {
    raw = await request.json();
  } catch {
    return NextResponse.json({ error: "Invalid JSON body." }, { status: 400 });
  }

  const parsed = parseBody(createCommentSchema, raw);
  if (!parsed.ok) return parsed.response;

  return withAdapter(request, (adapter) => adapter.createComment(parsed.data));
}
