import { NextRequest } from "next/server";

import { withAdapter } from "@/lib/platformRoute";

export async function GET(request: NextRequest) {
  const issueIdOrKey = request.nextUrl.searchParams.get("issueIdOrKey") ?? "";
  return withAdapter(request, (adapter) => adapter.getComments(issueIdOrKey));
}

export async function POST(request: NextRequest) {
  const payload = (await request.json()) as import("@mp/task-core").AddCommentPayload;
  return withAdapter(request, (adapter) => adapter.createComment(payload));
}
