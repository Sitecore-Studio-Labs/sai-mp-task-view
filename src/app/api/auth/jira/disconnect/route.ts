import { NextResponse } from "next/server";
import { disconnectUserJira } from "@/services/jiraService";

const DEMO_USER_ID = "00000000-0000-0000-0000-000000000001";

export async function POST() {
  try {
    await disconnectUserJira(DEMO_USER_ID);
    return NextResponse.json({ success: true });
  } catch (error) {
    // eslint-disable-next-line no-console
    console.error("Disconnect failed:", error);
    return NextResponse.json({ error: "Failed to disconnect" }, { status: 500 });
  }
}
