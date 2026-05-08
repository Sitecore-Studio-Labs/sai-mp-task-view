import { NextRequest } from "next/server";

import { withAdapterOrEmpty } from "@/lib/platformRoute";

export async function GET(request: NextRequest) {
  return withAdapterOrEmpty(request, (adapter) => adapter.getProjects());
}
