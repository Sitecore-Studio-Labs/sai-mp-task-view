import { NextRequest } from "next/server";

import { withAdapter } from "@/lib/platformRoute";

export async function GET(request: NextRequest) {
  const siteId = request.nextUrl.searchParams.get("siteId")?.trim() || undefined;
  return withAdapter(request, (adapter) => adapter.getProjects(siteId), { emptyOnNoAuth: true });
}
