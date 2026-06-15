import { NextRequest } from "next/server";

import { withAdapter } from "@/lib/platformRoute";

export async function GET(request: NextRequest) {
  const permission = request.nextUrl.searchParams.get("permission") ?? "";
  const issueKey = request.nextUrl.searchParams.get("issueKey") ?? undefined;
  const projectKey = request.nextUrl.searchParams.get("projectKey") ?? undefined;
  return withAdapter(request, async (adapter) => {
    const hasPermission = await adapter.getPermission(permission, { issueKey, projectKey });
    return { hasPermission };
  });
}
