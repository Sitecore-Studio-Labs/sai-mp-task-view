import { NextRequest } from "next/server";

import { withAdapter } from "@/lib/platformRoute";

export async function GET(request: NextRequest) {
  const projectKey = request.nextUrl.searchParams.get("projectKey") ?? "";
  return withAdapter(request, (adapter) => adapter.getProjectPriorities(projectKey));
}
