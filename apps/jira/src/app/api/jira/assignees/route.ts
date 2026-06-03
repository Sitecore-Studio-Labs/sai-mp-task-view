import { NextRequest, NextResponse } from "next/server";

import { withAdapter } from "@/lib/platformRoute";

export async function GET(request: NextRequest) {
  const projectIdOrKey = request.nextUrl.searchParams.get("projectId");
  const query = request.nextUrl.searchParams.get("query") ?? undefined;

  if (!projectIdOrKey) {
    return NextResponse.json(
      { error: "Missing required query parameter: projectId" },
      { status: 400 },
    );
  }

  return withAdapter(request, (adapter) =>
    adapter.getAssignees({ projectIdOrKey, query: query?.trim() || undefined }),
  );
}
