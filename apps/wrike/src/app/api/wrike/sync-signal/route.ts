import { NextResponse } from "next/server";

import { createSupabaseServerClient } from "@/lib/supabaseClient";

/**
 * Lightweight sync signal: returns the timestamp of the latest Wrike webhook
 * event stored in the database.
 *
 * Optional polling fallback for clients that cannot use Realtime.
 * The browser hook can poll this endpoint and trigger a query invalidation
 * when lastEventAt changes.
 *
 * GET /api/wrike/sync-signal
 * Response: { lastEventAt: string | null }
 */
export async function GET() {
  try {
    const supabase = createSupabaseServerClient();
    const { data: rows } = await supabase
      .from("wrike_webhook_events")
      .select("created_at")
      .order("created_at", { ascending: false })
      .limit(1);

    const lastEventAt =
      Array.isArray(rows) && rows.length > 0 && rows[0]?.created_at ? rows[0].created_at : null;

    return NextResponse.json({ lastEventAt });
  } catch {
    return NextResponse.json({ lastEventAt: null }, { status: 200 });
  }
}
