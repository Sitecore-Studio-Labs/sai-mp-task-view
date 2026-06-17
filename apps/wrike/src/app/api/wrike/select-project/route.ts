import { SupabaseTokenStore } from "@mp/token-storage";
import { NextRequest, NextResponse } from "next/server";

import { getWrikeUserIdFromSession } from "@/helpers/wrikeUserId";
import { WRIKE_STORE_CONFIG } from "@/lib/storeConfig";
import { createSupabaseServerClient } from "@/lib/supabaseClient";

export async function POST(req: NextRequest) {
  const userId = await getWrikeUserIdFromSession(req);
  if (!userId) {
    return NextResponse.json({ error: "No active Wrike connection." }, { status: 401 });
  }

  let body: unknown;
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: "Invalid JSON body." }, { status: 400 });
  }

  const projectKey =
    typeof body === "object" &&
    body !== null &&
    "projectKey" in body &&
    typeof (body as { projectKey: unknown }).projectKey === "string"
      ? (body as { projectKey: string }).projectKey.trim()
      : "";

  if (!projectKey) {
    return NextResponse.json({ error: "projectKey is required." }, { status: 400 });
  }

  const store = new SupabaseTokenStore(createSupabaseServerClient(), WRIKE_STORE_CONFIG);
  await store.updateProject(userId, projectKey);

  return NextResponse.json({ ok: true, projectKey });
}
