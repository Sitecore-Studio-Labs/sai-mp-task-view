import { NextResponse } from "next/server";

/**
 * @deprecated Project selection is now UI-state only and is no longer persisted to
 * jira_connections. This endpoint is a no-op kept for backward compatibility.
 * It will be removed when jira_connections.jira_project is dropped from the schema.
 */
export async function POST() {
  return NextResponse.json(
    { success: true, deprecated: "Project selection is now managed client-side." },
    { status: 200 },
  );
}
