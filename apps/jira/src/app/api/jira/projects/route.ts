import { NextRequest } from "next/server";

import { withAdapter } from "@/lib/platformRoute";

export async function GET(request: NextRequest) {
  const cloudId =
    request.nextUrl.searchParams.get("siteId")?.trim() ||
    request.nextUrl.searchParams.get("cloudId")?.trim() ||
    undefined;
  return withAdapter(request, (adapter) => adapter.getProjects(cloudId), { emptyOnNoAuth: true });
}
