import { NextRequest, NextResponse } from "next/server";

import { withAdapter } from "@/lib/platformRoute";

export async function GET(request: NextRequest) {
  const searchParams = request.nextUrl.searchParams;
  const permission = searchParams.get("permission")?.trim();
  const issueKey = searchParams.get("issueIdOrKey")?.trim() || undefined;
  const projectKey = searchParams.get("projectKey")?.trim() || undefined;

  if (!permission) {
    return NextResponse.json({ error: "permission is required" }, { status: 400 });
  }

  if (!projectKey) {
    return NextResponse.json({ error: "projectKey is required" }, { status: 400 });
  }

  return withAdapter(request, async (adapter) => {
    const hasPermission = await adapter.getPermission(permission, { issueKey, projectKey });
    return { hasPermission };
  });
}
