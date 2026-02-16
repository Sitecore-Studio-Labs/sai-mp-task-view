import { NextResponse } from "next/server";
import { hasUserJiraConnection } from "@/services/jiraService";

const DEMO_USER_ID = "00000000-0000-0000-0000-000000000001";

export async function GET() {
  try {
    const connected = await hasUserJiraConnection(DEMO_USER_ID);
    return NextResponse.json({ connected });
  } catch {
    return NextResponse.json({ connected: false });
  }
}
