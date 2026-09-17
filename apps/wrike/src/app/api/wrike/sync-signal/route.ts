import { query } from "@mp/db";
import { NextResponse } from "next/server";

/**
 * Lightweight sync signal: returns the latest webhook event time.
 * Wrike payloads have no project/folder key, so this is max(created_at)
 * across all events. Clients poll and invalidate when lastEventAt changes.
 * GET /api/wrike/sync-signal
 */
export async function GET() {
  try {
    const { rows } = await query<{ last_event_at: Date | string | null }>(
      `select max(created_at) as last_event_at from wrike_webhook_events`,
    );

    const createdAt = rows[0]?.last_event_at;
    const lastEventAt =
      createdAt instanceof Date
        ? createdAt.toISOString()
        : typeof createdAt === "string"
          ? createdAt
          : null;

    return NextResponse.json({ lastEventAt });
  } catch {
    return NextResponse.json({ lastEventAt: null }, { status: 200 });
  }
}
