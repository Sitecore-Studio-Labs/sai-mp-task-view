import { query } from "@mp/db";
import { NextRequest, NextResponse } from "next/server";

/**
 * Lightweight sync signal: returns the latest webhook event time for a project.
 * Optional fallback for clients that cannot use Realtime (e.g. poll when lastEventAt changes).
 * GET /api/jira/sync-signal?projectKey=KEY
 */
export async function GET(request: NextRequest) {
  const projectKey = request.nextUrl.searchParams.get("projectKey");
  if (!projectKey?.trim()) {
    return NextResponse.json({ error: "projectKey query parameter is required" }, { status: 400 });
  }

  try {
    const { rows } = await query<{ created_at: Date | string }>(
      `select created_at
       from jira_webhook_events
       where project_key = $1
       order by created_at desc
       limit 1`,
      [projectKey.trim()],
    );

    const createdAt = rows[0]?.created_at;
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
