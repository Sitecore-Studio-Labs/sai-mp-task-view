import { NextRequest } from "next/server";

import { withAdapter } from "@/lib/platformRoute";

export async function GET(request: NextRequest) {
  const projectId = request.nextUrl.searchParams.get("projectId") ?? "";
  if (projectId) {
    return withAdapter(request, (adapter) => adapter.getProjectPriorities(projectId));
  }
  return withAdapter(request, (adapter) => adapter.getPriorities());
}
