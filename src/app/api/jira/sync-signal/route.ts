import { NextRequest, NextResponse } from "next/server";
import { createSupabaseServerClient } from "@/lib/supabaseClient";

/**
 * Lightweight sync signal: returns the latest webhook event time for a project.
 * Optional fallback for clients that cannot use Realtime (e.g. poll when lastEventAt changes).
 * GET /api/jira/sync-signal?projectKey=KEY
 */
export async function GET(request: NextRequest) {
  const projectKey = request.nextUrl.searchParams.get("projectKey");
  if (!projectKey?.trim()) {
    return NextResponse.json(
      { error: "projectKey query parameter is required" },
      { status: 400 },
    );
  }

  try {
    const supabase = createSupabaseServerClient();
    const { data: rows } = await supabase
      .from("jira_webhook_events")
      .select("created_at")
      .eq("project_key", projectKey.trim())
      .order("created_at", { ascending: false })
      .limit(1);

    const lastEventAt =
      Array.isArray(rows) && rows.length > 0 && rows[0]?.created_at
        ? rows[0].created_at
        : null;

    return NextResponse.json({ lastEventAt });
  } catch {
    return NextResponse.json({ lastEventAt: null }, { status: 200 });
  }
}
